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
        "SELECT customer_id, name, email, phone, role FROM customers WHERE customer_id = %s",
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
# ============================================================
# Admin - stock and delivery-rule management. Requires role='admin'
# on the customers row (see auth.require_admin). Nobody has this role
# by default - promote a test account manually:
#   UPDATE customers SET role = 'admin' WHERE email = '...';
# ============================================================
@app.route("/api/admin/products/<int:product_id>/stock", methods=["PUT"])
@auth.require_admin
def update_stock(product_id):
    data = request.get_json(silent=True) or {}
    stock_quantity = data.get("stock_quantity")

    if stock_quantity is None:
        return jsonify({"error": "stock_quantity is required"}), 400
    try:
        stock_quantity = int(stock_quantity)
    except (ValueError, TypeError):
        return jsonify({"error": "stock_quantity must be an integer"}), 400
    if stock_quantity < 0:
        return jsonify({"error": "stock_quantity cannot be negative"}), 400

    row = query(
        """UPDATE products SET stock_quantity = %s WHERE product_id = %s
           RETURNING product_id, product_name, stock_quantity""",
        (stock_quantity, product_id), fetchone=True
    )
    if row is None:
        return jsonify({"error": "product not found"}), 404
    return jsonify(row)


@app.route("/api/admin/products/<int:product_id>/delivery-rules", methods=["PUT"])
@auth.require_admin
def update_delivery_rules(product_id):
    data = request.get_json(silent=True) or {}
    restock_cycle = data.get("restock_cycle")
    restock_day_of_week = data.get("restock_day_of_week")
    restock_day_of_month = data.get("restock_day_of_month")
    min_lead_days = data.get("min_lead_days", 3)

    if restock_cycle not in ("weekly", "monthly", "none"):
        return jsonify({"error": "restock_cycle must be 'weekly', 'monthly', or 'none'"}), 400
    if restock_cycle == "weekly" and restock_day_of_week is None:
        return jsonify({"error": "restock_day_of_week is required for weekly cycle"}), 400
    if restock_cycle == "monthly" and restock_day_of_month is None:
        return jsonify({"error": "restock_day_of_month is required for monthly cycle"}), 400

    product = query("SELECT product_id FROM products WHERE product_id = %s", (product_id,), fetchone=True)
    if product is None:
        return jsonify({"error": "product not found"}), 404

    row = query(
        """INSERT INTO product_delivery_rules
               (product_id, restock_cycle, restock_day_of_week, restock_day_of_month, min_lead_days)
           VALUES (%s, %s, %s, %s, %s)
           ON CONFLICT (product_id) DO UPDATE SET
               restock_cycle = EXCLUDED.restock_cycle,
               restock_day_of_week = EXCLUDED.restock_day_of_week,
               restock_day_of_month = EXCLUDED.restock_day_of_month,
               min_lead_days = EXCLUDED.min_lead_days,
               updated_at = CURRENT_TIMESTAMP
           RETURNING *""",
        (product_id, restock_cycle, restock_day_of_week, restock_day_of_month, min_lead_days),
        fetchone=True
    )
    return jsonify(row)

# ============================================================
# Admin — search log visibility. Shows what customers actually
# searched for and whether it resolved to a product. The
# result_found=false rows are the actionable ones: real customer
# queries that found nothing, which is the direct signal for which
# alias/hashtag is missing (see Proposal §4.1 / search_logs table
# design intent from early in this project).
# ============================================================
@app.route("/api/admin/search-logs", methods=["GET"])
@auth.require_admin
def get_search_logs():
    only_failed = request.args.get("only_failed", "false").lower() == "true"
    limit = request.args.get("limit", 50)
    try:
        limit = int(limit)
    except ValueError:
        limit = 50

    sql = """
        SELECT sl.log_id, sl.search_query, sl.result_found, sl.searched_at,
               sl.matched_product_id, p.product_name AS matched_product_name
        FROM search_logs sl
        LEFT JOIN products p ON p.product_id = sl.matched_product_id
    """
    if only_failed:
        sql += " WHERE sl.result_found = FALSE"
    sql += " ORDER BY sl.searched_at DESC LIMIT %s"

    rows = query(sql, (limit,))
    return jsonify({"results": rows})

# ============================================================
# Admin — add a missing search term to a product. This is the
# action side of the search-logs view: admin sees a failed search
# (e.g. "ashwagandha powder"), picks the right product, and adds
# the term here as an alias/regional/typo variant or as a hashtag —
# same term_type categories the whole search system already uses.
# ============================================================
@app.route("/api/admin/search-terms", methods=["POST"])
@auth.require_admin
def add_search_term():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    search_term = data.get("search_term", "").strip()
    term_type = data.get("term_type")
    language = data.get("language")

    valid_types = ("official", "alias", "regional", "typo", "hashtag")
    if not product_id or not search_term or term_type not in valid_types:
        return jsonify({
            "error": f"product_id, search_term, and term_type (one of {valid_types}) are required"
        }), 400

    product = query("SELECT product_id FROM products WHERE product_id = %s", (product_id,), fetchone=True)
    if product is None:
        return jsonify({"error": "product not found"}), 404

    row = query(
        """INSERT INTO search_terms (product_id, search_term, term_type, language)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (product_id, search_term) DO NOTHING
           RETURNING search_term_id, product_id, search_term, term_type, language""",
        (product_id, search_term, term_type, language),
        fetchone=True
    )

    if row is None:
        # ON CONFLICT DO NOTHING means no row is returned even when
        # it already existed — not a failure, just already there.
        return jsonify({"message": "term already exists for this product", "added": False}), 200

    return jsonify({"added": True, "term": row}), 201

# ============================================================
# API 6 — POST /api/orders
# "Customer places order" — step 1 of the mentor's order flow.
# Turns a cart (list of items) into a real orders + order_items
# record. Each item keeps its OWN delivery_date, matching the
# earlier "per item, not per order" scheduling requirement.
#
# Note: validates every item BEFORE inserting anything, since
# db.py's query() auto-commits each call individually rather than
# wrapping the whole request in one transaction — this reduces (but
# doesn't fully eliminate) the risk of a partially-created order if
# something fails mid-insert. A fully atomic version would need a
# dedicated transaction-aware connection helper in db.py — worth
# doing later if this becomes a real reliability concern.
#
# Does NOT touch stock_quantity — whether/when to decrement stock
# (at order time vs. later processing) wasn't specified and is a
# real decision worth confirming, not guessing.
# ============================================================
@app.route("/api/orders", methods=["POST"])
@auth.require_auth
def place_order():
    data = request.get_json(silent=True) or {}
    items = data.get("items")

    if not items or not isinstance(items, list):
        return jsonify({"error": "items must be a non-empty list"}), 400

    # ---- Validate every item first, before inserting anything ----
    validated_items = []
    for i, item in enumerate(items):
        product_id = item.get("product_id")
        quantity = item.get("quantity")
        delivery_date = item.get("delivery_date")

        if not product_id or not quantity or not delivery_date:
            return jsonify({
                "error": f"item {i}: product_id, quantity, and delivery_date are required"
            }), 400
        try:
            quantity = int(quantity)
            if quantity <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"error": f"item {i}: quantity must be a positive integer"}), 400

        product = query(
            "SELECT product_id, product_name, price FROM products WHERE product_id = %s",
            (product_id,), fetchone=True
        )
        if product is None:
            return jsonify({"error": f"item {i}: product {product_id} not found"}), 404

        validated_items.append({
            "product_id": product_id,
            "quantity": quantity,
            "delivery_date": delivery_date,
            "price_at_order": product["price"],
        })

    total_amount = sum(float(it["price_at_order"]) * it["quantity"] for it in validated_items)
    customer_id = request.customer["customer_id"]

    # ---- All validated — now actually create the order ----
    order = query(
        """INSERT INTO orders (customer_id, status, total_amount)
           VALUES (%s, 'pending', %s)
           RETURNING order_id, customer_id, status, total_amount, created_at""",
        (customer_id, total_amount), fetchone=True
    )

    created_items = []
    for it in validated_items:
        row = query(
            """INSERT INTO order_items (order_id, product_id, quantity, price_at_order, delivery_date)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING order_item_id, product_id, quantity, price_at_order, delivery_date""",
            (order["order_id"], it["product_id"], it["quantity"], it["price_at_order"], it["delivery_date"]),
            fetchone=True
        )
        created_items.append(row)

    order["items"] = created_items
    return jsonify(order), 201

# ============================================================
# API 7 — GET /api/orders/<id>
# Customer-facing order lookup — the "get Invoice / Order
# Confirmation" step right after placing an order. A customer can
# only view their OWN order; an admin can view any order (reuses
# the same endpoint rather than duplicating the shape admin already
# gets from GET /api/admin/orders).
#
# Includes the invoice as a nested object, null until admin raises
# one via POST /api/admin/orders/<id>/invoice — the confirmation
# page uses that null-ness to show "invoice not yet issued" vs the
# actual amount/dates once it exists.
# ============================================================
@app.route("/api/orders/<int:order_id>", methods=["GET"])
@auth.require_auth
def get_order(order_id):
    order = query(
        "SELECT order_id, customer_id, status, total_amount, created_at FROM orders WHERE order_id = %s",
        (order_id,), fetchone=True
    )
    if order is None:
        return jsonify({"error": "order not found"}), 404

    if order["customer_id"] != request.customer["customer_id"]:
        role_row = query(
            "SELECT role FROM customers WHERE customer_id = %s",
            (request.customer["customer_id"],), fetchone=True
        )
        if not role_row or role_row["role"] != "admin":
            return jsonify({"error": "not authorized to view this order"}), 403

    items = query(
        """SELECT oi.order_item_id, oi.product_id, p.product_name,
                  oi.quantity, oi.price_at_order, oi.delivery_date
           FROM order_items oi
           JOIN products p ON p.product_id = oi.product_id
           WHERE oi.order_id = %s""",
        (order_id,)
    )
    order["items"] = items

    invoice = query(
        """SELECT invoice_id, amount, issued_at, paid_at, payment_note,
                  processed_at
           FROM invoices WHERE order_id = %s""",
        (order_id,), fetchone=True
    )
    order["invoice"] = invoice

    return jsonify(order)


# ============================================================
# Admin — list orders, for the "admin reviews" step of the order
# flow. Filterable by status (e.g. ?status=pending to see only
# orders awaiting review/invoicing).
# ============================================================
@app.route("/api/admin/orders", methods=["GET"])
@auth.require_admin
def get_orders():
    status_filter = request.args.get("status")
    limit = request.args.get("limit", 50)
    try:
        limit = int(limit)
    except ValueError:
        limit = 50

    sql = """
        SELECT o.order_id, o.customer_id, c.name AS customer_name, c.email AS customer_email,
               o.status, o.total_amount, o.created_at
        FROM orders o
        JOIN customers c ON c.customer_id = o.customer_id
    """
    params = []
    if status_filter:
        sql += " WHERE o.status = %s"
        params.append(status_filter)
    sql += " ORDER BY o.created_at DESC LIMIT %s"
    params.append(limit)

    orders = query(sql, tuple(params))

    # Attach line items for each order — small dataset (admin view,
    # not customer-facing at scale), N+1 queries here is an
    # acceptable trade-off for simplicity over a more complex single
    # join-and-group query.
    for order in orders:
        items = query(
            """SELECT oi.order_item_id, oi.product_id, p.product_name,
                      oi.quantity, oi.price_at_order, oi.delivery_date
               FROM order_items oi
               JOIN products p ON p.product_id = oi.product_id
               WHERE oi.order_id = %s""",
            (order["order_id"],)
        )
        order["items"] = items

    return jsonify({"results": orders})

# ============================================================
# Admin — raise an invoice for an order. Step 3 of the mentor's
# flow ("admin raises invoice"). Only works on 'pending' orders —
# can't invoice something already invoiced/paid/cancelled, since
# that would silently overwrite an existing invoice via the UNIQUE
# constraint on invoices.order_id.
#
# amount defaults to the order's own total_amount, but admin can
# override it (e.g. adding a delivery fee, correcting a price) —
# matches the schema note that invoice amount may differ from the
# order's original total.
# ============================================================
@app.route("/api/admin/orders/<int:order_id>/invoice", methods=["POST"])
@auth.require_admin
def raise_invoice(order_id):
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    order = query(
        "SELECT order_id, status, total_amount FROM orders WHERE order_id = %s",
        (order_id,), fetchone=True
    )
    if order is None:
        return jsonify({"error": "order not found"}), 404
    if order["status"] != "pending":
        return jsonify({
            "error": f"order must be 'pending' to invoice — current status is '{order['status']}'"
        }), 409

    if amount is None:
        amount = order["total_amount"]
    else:
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"error": "amount must be a positive number"}), 400

    admin_id = request.customer["customer_id"]

    invoice = query(
        """INSERT INTO invoices (order_id, amount, issued_by)
           VALUES (%s, %s, %s)
           RETURNING invoice_id, order_id, amount, issued_by, issued_at""",
        (order_id, amount, admin_id), fetchone=True
    )

    query("UPDATE orders SET status = 'invoiced' WHERE order_id = %s RETURNING order_id", (order_id,), fetchone=True)

    return jsonify(invoice), 201

# ============================================================
# Admin — advance an order through the rest of its lifecycle.
# Three separate actions, each with its own status guard so the
# state machine can't be skipped or run backwards:
#   invoiced -> paid -> processed
#   pending/invoiced -> cancelled (not allowed once paid — money's
#   already changed hands by then, cancelling needs a real refund
#   conversation, not just a status flip)
# ============================================================

@app.route("/api/admin/orders/<int:order_id>/pay", methods=["POST"])
@auth.require_admin
def mark_order_paid(order_id):
    data = request.get_json(silent=True) or {}
    payment_note = data.get("payment_note")

    order = query("SELECT order_id, status FROM orders WHERE order_id = %s", (order_id,), fetchone=True)
    if order is None:
        return jsonify({"error": "order not found"}), 404
    if order["status"] != "invoiced":
        return jsonify({
            "error": f"order must be 'invoiced' to mark paid — current status is '{order['status']}'"
        }), 409

    query(
        "UPDATE invoices SET paid_at = CURRENT_TIMESTAMP, payment_note = %s WHERE order_id = %s RETURNING invoice_id",
        (payment_note, order_id), fetchone=True
    )
    updated = query(
        "UPDATE orders SET status = 'paid' WHERE order_id = %s RETURNING order_id, status",
        (order_id,), fetchone=True
    )
    return jsonify(updated)


@app.route("/api/admin/orders/<int:order_id>/process", methods=["POST"])
@auth.require_admin
def mark_order_processed(order_id):
    order = query("SELECT order_id, status FROM orders WHERE order_id = %s", (order_id,), fetchone=True)
    if order is None:
        return jsonify({"error": "order not found"}), 404
    if order["status"] != "paid":
        return jsonify({
            "error": f"order must be 'paid' to process — current status is '{order['status']}'"
        }), 409

    admin_id = request.customer["customer_id"]
    query(
        "UPDATE invoices SET processed_at = CURRENT_TIMESTAMP, processed_by = %s WHERE order_id = %s RETURNING invoice_id",
        (admin_id, order_id), fetchone=True
    )
    updated = query(
        "UPDATE orders SET status = 'processed' WHERE order_id = %s RETURNING order_id, status",
        (order_id,), fetchone=True
    )
    return jsonify(updated)


@app.route("/api/admin/orders/<int:order_id>/cancel", methods=["POST"])
@auth.require_admin
def cancel_order(order_id):
    order = query("SELECT order_id, status FROM orders WHERE order_id = %s", (order_id,), fetchone=True)
    if order is None:
        return jsonify({"error": "order not found"}), 404
    if order["status"] not in ("pending", "invoiced"):
        return jsonify({
            "error": f"can't cancel an order that's already '{order['status']}' — "
                     f"payment has occurred, this needs a refund process, not a status flip"
        }), 409

    updated = query(
        "UPDATE orders SET status = 'cancelled' WHERE order_id = %s RETURNING order_id, status",
        (order_id,), fetchone=True
    )
    return jsonify(updated)

# ============================================================
# Admin — remove an item from an order, e.g. when a product turns
# out to be unavailable during review. Only allowed while the order
# is still 'pending' — once invoiced, the amount is what the
# customer sees and is expected to pay, so it shouldn't silently
# change under them. A correction after invoicing needs a proper
# re-invoice flow, not a quiet edit.
# ============================================================
@app.route("/api/admin/orders/<int:order_id>/items/<int:order_item_id>", methods=["DELETE"])
@auth.require_admin
def remove_order_item(order_id, order_item_id):
    order = query("SELECT order_id, status FROM orders WHERE order_id = %s", (order_id,), fetchone=True)
    if order is None:
        return jsonify({"error": "order not found"}), 404
    if order["status"] != "pending":
        return jsonify({
            "error": f"can only modify items while order is 'pending' — current status is '{order['status']}'"
        }), 409

    item = query(
        "SELECT order_item_id FROM order_items WHERE order_item_id = %s AND order_id = %s",
        (order_item_id, order_id), fetchone=True
    )
    if item is None:
        return jsonify({"error": "item not found on this order"}), 404

    remaining = query(
        "SELECT COUNT(*) AS count FROM order_items WHERE order_id = %s",
        (order_id,), fetchone=True
    )
    if remaining["count"] <= 1:
        return jsonify({
            "error": "can't remove the last item on an order — cancel the whole order instead"
        }), 409

    query("DELETE FROM order_items WHERE order_item_id = %s RETURNING order_item_id", (order_item_id,), fetchone=True)

    # Recalculate the order total from whatever items are left.
    new_total = query(
        """SELECT COALESCE(SUM(price_at_order * quantity), 0) AS total
           FROM order_items WHERE order_id = %s""",
        (order_id,), fetchone=True
    )
    updated_order = query(
        "UPDATE orders SET total_amount = %s WHERE order_id = %s RETURNING order_id, status, total_amount",
        (new_total["total"], order_id), fetchone=True
    )

    remaining_items = query(
        """SELECT oi.order_item_id, oi.product_id, p.product_name,
                  oi.quantity, oi.price_at_order, oi.delivery_date
           FROM order_items oi
           JOIN products p ON p.product_id = oi.product_id
           WHERE oi.order_id = %s""",
        (order_id,)
    )
    updated_order["items"] = remaining_items

    return jsonify(updated_order)


# ============================================================
# Admin — replace an item on an order in place, without touching
# the rest of the order. Covers two real ops scenarios:
#   1. Swap to a different product (e.g. same herb, different
#      brand) after contacting the customer — admin manually picks
#      the new product_id here; the customer conversation already
#      happened outside the system, so no extra protocol is needed
#      on this endpoint.
#   2. Correct the quantity actually being fulfilled (e.g. customer
#      ordered 2L but only 1L is available) — only quantity changes,
#      price_at_order (the per-unit price) is left as-is.
#
# Any subset of product_id / quantity / delivery_date can be sent;
# only what's provided gets updated. If product_id changes, the new
# product's CURRENT price replaces price_at_order — a brand swap
# shouldn't keep billing the old product's price. If only quantity
# changes, price_at_order stays untouched since it's a per-unit
# price, not a line total.
#
# Same 'pending' guard as remove_order_item, for the same reason:
# once invoiced, the amount is what the customer sees and is
# expected to pay — a correction after that needs a re-invoice, not
# a quiet edit.
# ============================================================
@app.route("/api/admin/orders/<int:order_id>/items/<int:order_item_id>", methods=["PUT"])
@auth.require_admin
def replace_order_item(order_id, order_item_id):
    data = request.get_json(silent=True) or {}
    new_product_id = data.get("product_id")
    new_quantity = data.get("quantity")
    new_delivery_date = data.get("delivery_date")

    if new_product_id is None and new_quantity is None and new_delivery_date is None:
        return jsonify({
            "error": "provide at least one of product_id, quantity, delivery_date to update"
        }), 400

    order = query("SELECT order_id, status FROM orders WHERE order_id = %s", (order_id,), fetchone=True)
    if order is None:
        return jsonify({"error": "order not found"}), 404
    if order["status"] != "pending":
        return jsonify({
            "error": f"can only modify items while order is 'pending' — current status is '{order['status']}'"
        }), 409

    item = query(
        """SELECT order_item_id, product_id, quantity, price_at_order, delivery_date
           FROM order_items WHERE order_item_id = %s AND order_id = %s""",
        (order_item_id, order_id), fetchone=True
    )
    if item is None:
        return jsonify({"error": "item not found on this order"}), 404

    product_id = item["product_id"]
    price_at_order = item["price_at_order"]

    if new_product_id is not None:
        product = query(
            "SELECT product_id, price FROM products WHERE product_id = %s",
            (new_product_id,), fetchone=True
        )
        if product is None:
            return jsonify({"error": f"product {new_product_id} not found"}), 404
        product_id = product["product_id"]
        price_at_order = product["price"]

    if new_quantity is not None:
        try:
            new_quantity = int(new_quantity)
            if new_quantity <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"error": "quantity must be a positive integer"}), 400
    else:
        new_quantity = item["quantity"]

    delivery_date = new_delivery_date if new_delivery_date is not None else item["delivery_date"]

    query(
        """UPDATE order_items
           SET product_id = %s, quantity = %s, price_at_order = %s, delivery_date = %s
           WHERE order_item_id = %s
           RETURNING order_item_id""",
        (product_id, new_quantity, price_at_order, delivery_date, order_item_id),
        fetchone=True
    )

    # Recalculate the order total from all items after the swap.
    new_total = query(
        """SELECT COALESCE(SUM(price_at_order * quantity), 0) AS total
           FROM order_items WHERE order_id = %s""",
        (order_id,), fetchone=True
    )
    updated_order = query(
        "UPDATE orders SET total_amount = %s WHERE order_id = %s RETURNING order_id, status, total_amount",
        (new_total["total"], order_id), fetchone=True
    )

    remaining_items = query(
        """SELECT oi.order_item_id, oi.product_id, p.product_name,
                  oi.quantity, oi.price_at_order, oi.delivery_date
           FROM order_items oi
           JOIN products p ON p.product_id = oi.product_id
           WHERE oi.order_id = %s""",
        (order_id,)
    )
    updated_order["items"] = remaining_items

    return jsonify(updated_order)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)