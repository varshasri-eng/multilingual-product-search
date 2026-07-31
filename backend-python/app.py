from flask import Flask, request, jsonify
from flask_cors import CORS
from db import query
import os
from dotenv import load_dotenv
import auth
from datetime import date
from delivery import get_earliest_delivery_date

load_dotenv()

app = Flask(__name__)
CORS(app)


# ============================================================
# API 1 — GET /api/products/<id>
# "Give id, get details from DB."
# ============================================================
@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    sql = """
        SELECT
            p.product_id, p.product_name, p.scientific_name, p.description,
            p.price, p.stock_quantity, p.image_url, p.product_code, p.weight,
            c.category_name, s.subcategory_name,
            COALESCE(array_agg(DISTINCT t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL), '{}') AS tags,
            COALESCE(array_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '{}') AS gallery_images,
            COALESCE(array_agg(DISTINCT st.search_term) FILTER (
                WHERE st.term_type IN ('alias', 'regional') AND st.search_term <> p.product_name
            ), '{}') AS aliases
        FROM products p
        LEFT JOIN categories c ON c.category_id = p.category_id
        LEFT JOIN subcategories s ON s.subcategory_id = p.subcategory_id
        LEFT JOIN product_tags pt ON pt.product_id = p.product_id
        LEFT JOIN tags t ON t.tag_id = pt.tag_id
        LEFT JOIN product_images pi ON pi.product_id = p.product_id
        LEFT JOIN search_terms st ON st.product_id = p.product_id
        WHERE p.product_id = %s
        GROUP BY p.product_id, c.category_name, s.subcategory_name
    """
    row = query(sql, (product_id,), fetchone=True)
    if row is None:
        return jsonify({"error": "product not found"}), 404

    session_id = request.args.get("session_id", "anonymous")
    query("SELECT log_product_view(%s, %s)", (session_id, product_id))

    return jsonify(row)


# ============================================================
# API 2 — GET /api/related?product_id=X  OR  ?keyword=X
# ============================================================
@app.route("/api/related", methods=["GET"])
def get_related():
    product_id = request.args.get("product_id")
    keyword = request.args.get("keyword")
    session_id = request.args.get("session_id")

    if not product_id and not keyword:
        return jsonify({"error": "provide either product_id or keyword"}), 400

    if keyword:
        search_rows = query("SELECT * FROM search_products(%s)", (keyword,))
        if not search_rows:
            return jsonify({"matched_product": None, "results": [], "message": "no match found"})

        top_match = search_rows[0]
        related_rows = query(
            "SELECT * FROM get_related_products(%s, %s, 6)",
            (top_match["product_id"], session_id),
        )
        return jsonify({
            "matched_product": {
                "product_id": top_match["product_id"],
                "product_name": top_match["product_name"],
                "matched_term": top_match["matched_term"],
                "term_type": top_match["term_type"],
            },
            "results": related_rows,
        })

    try:
        pid = int(product_id)
    except ValueError:
        return jsonify({"error": "product_id must be a number"}), 400

    related_rows = query("SELECT * FROM get_related_products(%s, %s, 6)", (pid, session_id))
    return jsonify({"matched_product": None, "results": related_rows})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ============================================================
# Auth — email+password (see database/add_customers.sql note on
# why this isn't phone+OTP yet)
# ============================================================
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone")

    if not name or not email or not password:
        return jsonify({"error": "name, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "password must be at least 8 characters"}), 400

    result, error = auth.register(name, email, password, phone)
    if error:
        return jsonify({"error": error}), 409
    return jsonify(result), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    result, error = auth.login(email, password)
    if error:
        return jsonify({"error": error}), 401
    return jsonify(result)


@app.route("/api/auth/me", methods=["GET"])
@auth.require_auth
def me():
    row = query(
        "SELECT customer_id, name, email, phone FROM customers WHERE customer_id = %s",
        (request.customer["customer_id"],),
        fetchone=True,
    )
    if row is None:
        return jsonify({"error": "customer not found"}), 404
    return jsonify(row)


# ============================================================
# API 4 — GET /api/recently-viewed?session_id=X&exclude=Y
# "Browse history of product customer visited" — this is the
# THIS-visitor's own view history (from product_views), not the
# aggregate cross-visitor signal get_related_products() uses for
# 'history'-sourced related products. Different concept: related
# products = "others who viewed this also viewed"; recently viewed
# = "you personally looked at these".
# ============================================================
@app.route("/api/recently-viewed", methods=["GET"])
def recently_viewed():
    session_id = request.args.get("session_id")
    exclude_id = request.args.get("exclude")  # usually the current product

    if not session_id:
        return jsonify({"results": []})

    sql = """
        SELECT DISTINCT ON (p.product_id)
            p.product_id, p.product_name, p.price, p.product_code,
            pv.viewed_at
        FROM product_views pv
        JOIN products p ON p.product_id = pv.product_id
        WHERE pv.session_id = %s
    """
    params = [session_id]

    if exclude_id:
        sql += " AND p.product_id <> %s"
        params.append(exclude_id)

    # DISTINCT ON needs its ORDER BY to start with the same column(s);
    # the outer ORDER BY re-sorts by recency after de-duplication.
    sql = f"""
        SELECT * FROM ({sql} ORDER BY p.product_id, pv.viewed_at DESC) sub
        ORDER BY sub.viewed_at DESC
        LIMIT 6
    """

    rows = query(sql, tuple(params))
    return jsonify({"results": rows})


# ============================================================
# API 3 — GET /api/search?keyword=X
# Real multi-result search. search_products() already ranks and
# returns up to 5 direct matches (official/alias/regional/typo/
# hashtag) — this just exposes that list directly, instead of the
# /api/related endpoint's old behavior of collapsing it down to one
# top match plus that match's related items. Those are two different
# concepts: this is "what matches the keyword", /api/related is
# "what's related to a specific product".
# ============================================================
@app.route("/api/search", methods=["GET"])
def search():
    keyword = request.args.get("keyword")
    if not keyword:
        return jsonify({"error": "keyword is required"}), 400

    rows = query("SELECT * FROM search_products(%s)", (keyword,))
    return jsonify({"query": keyword, "results": rows})

# ============================================================
# API 5 — GET /api/products/:id/availability
# Returns the earliest valid delivery date for this product, given
# its current stock and its restock rule (if any). Pure wrapper
# around delivery.get_earliest_delivery_date() — see that file for
# the actual date math, which is unit tested separately in
# test_delivery.py.
# ============================================================
@app.route("/api/products/<int:product_id>/availability", methods=["GET"])
def product_availability(product_id):
    product = query(
        "SELECT product_id, stock_quantity FROM products WHERE product_id = %s",
        (product_id,), fetchone=True
    )
    if product is None:
        return jsonify({"error": "product not found"}), 404

    rule = query(
        """SELECT restock_cycle, restock_day_of_week, restock_day_of_month, min_lead_days
           FROM product_delivery_rules WHERE product_id = %s""",
        (product_id,), fetchone=True
    )

    in_stock = product["stock_quantity"] is not None and product["stock_quantity"] > 0

    if rule is None:
        # No configured rule — no scheduling restriction beyond
        # actual stock status (see add_delivery_rules.sql notes).
        restock_cycle = "none"
        restock_day_of_week = None
        restock_day_of_month = None
        min_lead_days = 0
    else:
        restock_cycle = rule["restock_cycle"]
        restock_day_of_week = rule["restock_day_of_week"]
        restock_day_of_month = rule["restock_day_of_month"]
        min_lead_days = rule["min_lead_days"]

    earliest_date = get_earliest_delivery_date(
        date.today(), in_stock, restock_cycle,
        restock_day_of_week, restock_day_of_month, min_lead_days
    )

    return jsonify({
        "product_id": product_id,
        "in_stock": in_stock,
        "restock_cycle": restock_cycle,
        "min_lead_days": min_lead_days,
        "earliest_delivery_date": earliest_date.isoformat() if earliest_date else None,
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)