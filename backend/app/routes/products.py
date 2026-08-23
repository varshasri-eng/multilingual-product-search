"""
Product Routes
--------------
GET /api/products                         - list active products (category + multilingual fuzzy search)
GET /api/products/categories              - list active categories
GET /api/products/<id>                    - product detail + aliases (logs a view)
GET /api/products/<id>/related            - related products (co-viewed + same category)
GET /api/products/recently-viewed         - this visitor's view history

Search matches the English product name plus every search term (regional
names in Telugu/Hindi/Tamil, aliases, common typos, hashtags), with fuzzy
(typo-tolerant) matching, ranked by term_type so exact/official matches
surface first. Every search is logged to search_logs for the admin
search-insights view.
"""

from difflib import SequenceMatcher
from datetime import date

from flask import Blueprint, request, jsonify
from sqlalchemy import func, distinct

from app import db
from app.models.product import Category, Product
from app.models.search_term import SearchTerm
from app.models.search_log import SearchLog
from app.models.product_view import ProductView
from app.models.delivery_rule import ProductDeliveryRule
from app.utils.delivery import get_earliest_delivery_date

products_bp = Blueprint("products", __name__)

TERM_WEIGHT = {
    "official": 100,
    "alias": 70,
    "regional": 60,
    "typo": 40,
    "hashtag": 40,
}
NAME_WEIGHT = 90
FUZZY_THRESHOLD = 0.72


def _similar(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _score_match(q: str, candidate: str, weight: int):
    """Return (score, similarity) for one candidate term vs the query."""
    if not candidate:
        return 0, 0.0
    c = candidate.lower()
    score = 0
    sim = 0.0
    if c == q:
        score = weight + 15
    elif c.startswith(q) or q.startswith(c):
        score = weight + 5
    elif q in c or c in q:
        score = weight
    else:
        sim = _similar(q, c)
        if sim >= FUZZY_THRESHOLD:
            score = round(weight * sim)
    return score, sim


def _best_match(product, q: str):
    """Best (score, matched_term, term_type, similarity) for a product."""
    best = (0, None, None, 0.0)

    score, sim = _score_match(q, product.name, NAME_WEIGHT)
    if score > 0:
        best = (score, product.name, "official", sim)

    for term in product.search_terms:
        weight = TERM_WEIGHT.get(term.term_type, 40)
        score, sim = _score_match(q, term.search_term, weight)
        if score > best[0] or (
            score == best[0]
            and best[0] > 0
            and term.term_type in {"official", "alias", "regional"}
        ):
            best = (score, term.search_term, term.term_type, sim)

    return best


def _log_search(q: str, matched_product_id, found: bool):
    db.session.add(SearchLog(
        search_query=q,
        matched_product_id=matched_product_id,
        result_found=found,
    ))
    db.session.commit()


@products_bp.route("", methods=["GET"])
def list_products():
    category = request.args.get("category", "").strip()
    search   = request.args.get("search", "").strip()

    query = Product.query.join(Category).filter_by(is_active=True)

    if category and category.lower() != "all":
        query = query.filter(
            (Category.name == category) | (Category.slug == category.lower())
        )

    products = query.all()

    if search:
        q = search.lower().strip()
        scored = []
        for p in products:
            score, matched_term, term_type, sim = _best_match(p, q)
            if score > 0:
                scored.append((score, p, matched_term, term_type, sim))
        scored.sort(key=lambda row: (-row[0], row[1].category.display_order, row[1].name))
        products = [row[1] for row in scored]
        matches = {p.id: {"matched_term": mt, "term_type": tt, "similarity": s}
                   for _, p, mt, tt, s in scored}
        _log_search(search, scored[0][1].id if scored else None, bool(scored))
    else:
        products = sorted(products, key=lambda p: (p.category.display_order, p.name))
        matches = {}

    return jsonify({
        "count": len(products),
        "products": [
            {**p.to_dict(), **(matches.get(p.id) or {})} for p in products
        ],
    }), 200


@products_bp.route("/categories", methods=["GET"])
def list_categories():
    categories = (
        Category.query.filter_by(is_active=True)
                 .order_by(Category.display_order, Category.name)
                 .all()
    )
    return jsonify({
        "categories": [c.to_dict() for c in categories],
    }), 200


# ── PRODUCT DETAIL ───────────────────────────────────────────
@products_bp.route("/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return jsonify({"error": "Product not found."}), 404

    session_id = (request.args.get("session_id") or "anonymous")[:100]
    db.session.add(ProductView(session_id=session_id, product_id=product.id))
    db.session.commit()

    aliases = [
        t.search_term for t in product.search_terms
        if t.term_type in {"alias", "regional"} and
        t.search_term.lower() != product.name.lower()
    ]

    return jsonify({
        "product": {
            **product.to_dict(),
            "aliases": sorted(set(aliases)),
        },
    }), 200


# ── RELATED PRODUCTS ─────────────────────────────────────────
@products_bp.route("/<int:product_id>/related", methods=["GET"])
def related_products(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    session_id = (request.args.get("session_id") or "")[:100]

    # behavioral: products viewed in the same sessions as this one
    co_sessions = db.session.query(ProductView.session_id).filter(
        ProductView.product_id == product_id
    ).subquery()
    co_viewed = (
        db.session.query(
            ProductView.product_id.label("pid"),
            func.count(distinct(ProductView.session_id)).label("cnt"),
        )
        .filter(ProductView.session_id.in_(co_sessions))
        .filter(ProductView.product_id != product_id)
        .group_by(ProductView.product_id)
        .all()
    )
    co_counts = {row.pid: row.cnt for row in co_viewed}

    rows = []
    for other in Product.query.filter(
        Product.is_active.is_(True), Product.id != product_id
    ).all():
        co = co_counts.get(other.id, 0)
        same_cat = other.category_id == product.category_id
        if co == 0 and not same_cat:
            continue
        score = co * 10 + (5 if same_cat else 0)
        rows.append({
            "product_id": other.id,
            "product_name": other.name,
            "emoji": other.emoji,
            "price": float(other.discounted_price or other.price),
            "unit": other.unit,
            "diet": other.diet,
            "source": "history" if co > 0 else "category",
            "score": score,
        })

    rows.sort(key=lambda r: -r["score"])
    return jsonify({"results": rows[:6]}), 200


# ── RECENTLY VIEWED ──────────────────────────────────────────
@products_bp.route("/recently-viewed", methods=["GET"])
def recently_viewed():
    session_id = (request.args.get("session_id") or "")[:100]
    if not session_id:
        return jsonify({"results": []}), 200

    # most recent distinct product per session, then re-sort by recency
    sub = (
        db.session.query(ProductView)
        .filter(ProductView.session_id == session_id)
        .order_by(ProductView.product_id, ProductView.viewed_at.desc())
        .distinct(ProductView.product_id)
        .subquery()
    )
    views = (
        db.session.query(sub)
        .order_by(sub.c.viewed_at.desc())
        .limit(6)
        .all()
    )

    results = []
    for v in views:
        product = Product.query.get(v.product_id)
        if product:
            results.append(product.to_dict())

    return jsonify({"results": results}), 200

# ── DELIVERY AVAILABILITY ──────────────────────────────────────
@products_bp.route("/<int:product_id>/availability", methods=["GET"])
def product_availability(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({"error": "product not found"}), 404

    try:
        requested_quantity = int(request.args.get("quantity", 1))
    except (TypeError, ValueError):
        requested_quantity = 1

    if requested_quantity <= 0:
        return jsonify({
            "error": "quantity must be a positive integer"
        }), 400

    rule = ProductDeliveryRule.query.get(product_id)

    if rule is None:
        restock_cycle = "none"
        restock_day_of_week = None
        restock_day_of_month = None
        min_lead_days = 0
    else:
        restock_cycle = rule.restock_cycle
        restock_day_of_week = rule.restock_day_of_week
        restock_day_of_month = rule.restock_day_of_month
        min_lead_days = rule.min_lead_days

    # Stock is sufficient only when it can cover the
    # customer's requested quantity.
    sufficient_stock = (
        product.stock_quantity is None
        or product.stock_quantity >= requested_quantity
    )

    earliest_date = get_earliest_delivery_date(
        date.today(),
        sufficient_stock,
        restock_cycle,
        restock_day_of_week,
        restock_day_of_month,
        min_lead_days
    )

    return jsonify({
        "product_id": product_id,
        "requested_quantity": requested_quantity,

        "in_stock": product.stock_quantity is not None
                     and product.stock_quantity > 0,

        "in_stock_for_quantity": sufficient_stock,

        "stock_quantity": product.stock_quantity,

        "restock_cycle": restock_cycle,
        "restock_day_of_week": restock_day_of_week,
        "restock_day_of_month": restock_day_of_month,
        "min_lead_days": min_lead_days,

        "earliest_delivery_date": (
            earliest_date.isoformat()
            if earliest_date else None
        ),
    }), 200