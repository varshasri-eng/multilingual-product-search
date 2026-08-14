"""
Admin Routes — Customer Aspect
-------------------------------
GET  /api/admin/customers                    - list all customers (search, filter, paginate)
GET  /api/admin/customers/<id>               - full customer profile
PUT  /api/admin/customers/<id>               - edit customer details
PUT  /api/admin/customers/<id>/deactivate    - deactivate customer
PUT  /api/admin/customers/<id>/activate      - reactivate customer
PUT  /api/admin/customers/<id>/role          - change role (customer ↔ admin)
GET  /api/admin/customers/<id>/orders        - customer order history
GET  /api/admin/customers/<id>/addresses     - customer addresses
DELETE /api/admin/customers/<id>             - hard delete (use with caution)

GET  /api/admin/stats/customers              - dashboard counts
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.customer import Customer
from app.models.address import Address, CustomerAddress
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.utils.auth import admin_required

admin_bp = Blueprint("admin", __name__)

VALID_ROLES      = {"customer", "admin"}
VALID_LANGUAGES  = {"english", "telugu", "hindi", "tamil"}
VALID_DIET       = {"veg", "nonveg", "both"}
VALID_ORDER_TYPE = {"delivery", "pickup"}

# ── ORDER MANAGEMENT ──────────────────────────────────────────
@admin_bp.route("/orders", methods=["GET"])
@admin_required
def list_orders(customer):
    """
    List customer orders for the admin order-management panel.

    Optional:
        ?status=pending
    """
    status = (request.args.get("status") or "").strip().lower()

    query = Order.query

    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.created_at.desc()).all()

    results = []

    for order in orders:
        customer_obj = Customer.query.get(order.customer_id)

        items = []

        for item in order.items:
            product = Product.query.get(item.product_id) if item.product_id else None

            items.append({
                "id": item.id,
                "order_id": item.order_id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "unit": item.unit,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "line_total": float(item.line_total),
                "stock_quantity": (
                    product.stock_quantity if product else None
                ),
            })

        results.append({
            "id": order.id,
            "order_number": order.order_number,
            "customer_id": order.customer_id,
            "customer_name": customer_obj.name if customer_obj else None,
            "status": order.status,
            "subtotal": float(order.subtotal or 0),
            "delivery_fee": float(order.delivery_fee or 0),
            "discount_amount": float(order.discount_amount or 0),
            "total_amount": float(order.total_amount or 0),
            "order_type": order.order_type,
            "requested_date": (
                order.requested_date.isoformat()
                if order.requested_date
                else None
            ),
            "requested_time_slot": order.requested_time_slot,
            "created_at": (
                order.created_at.isoformat()
                if order.created_at
                else None
            ),
            "items": items,
        })

    return jsonify({"results": results}), 200

# ── REMOVE ORDER ITEM ─────────────────────────────────────────
@admin_bp.route("/orders/<int:order_id>/items/<int:item_id>", methods=["DELETE"])
@admin_required
def remove_order_item(customer, order_id, item_id):
    """
    Remove one item from an order.

    The admin decides whether the item should be removed.
    After removal, order subtotal and total are recalculated.
    """

    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Order not found."}), 404

    item = OrderItem.query.filter_by(
        id=item_id,
        order_id=order_id
    ).first()

    if not item:
        return jsonify({"error": "Order item not found."}), 404

    # Remove the item
    db.session.delete(item)
    db.session.flush()

    # Recalculate subtotal from remaining items
    subtotal = sum(
        float(order_item.line_total or 0)
        for order_item in order.items
    )

    order.subtotal = round(subtotal, 2)

    # Keep the existing delivery fee and discount
    order.total_amount = round(
        order.subtotal
        + float(order.delivery_fee or 0)
        - float(order.discount_amount or 0),
        2
    )

    db.session.commit()

    return jsonify({
        "message": "Order item removed successfully.",
        "order_id": order.id,
        "order_number": order.order_number,
        "subtotal": float(order.subtotal),
        "delivery_fee": float(order.delivery_fee or 0),
        "discount_amount": float(order.discount_amount or 0),
        "total_amount": float(order.total_amount),
        "items_remaining": len(order.items),
    }), 200


# ── REPLACE ORDER ITEM ────────────────────────────────────────
@admin_bp.route(
    "/orders/<int:order_id>/items/<int:item_id>/replace",
    methods=["PUT"]
)
@admin_required
def replace_order_item(customer, order_id, item_id):
    """
    Replace an existing order item with another product.

    The admin chooses the replacement product and quantity.
    No automatic weight/unit conversion is performed.
    """

    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Order not found."}), 404

    item = OrderItem.query.filter_by(
        id=item_id,
        order_id=order_id
    ).first()

    if not item:
        return jsonify({"error": "Order item not found."}), 404

    data = request.get_json(silent=True) or {}

    replacement_product_id = data.get("replacement_product_id")
    quantity = data.get("quantity")

    if not replacement_product_id:
        return jsonify({
            "error": "replacement_product_id is required."
        }), 400

    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({
            "error": "quantity must be a positive integer."
        }), 400

    if quantity <= 0:
        return jsonify({
            "error": "quantity must be a positive integer."
        }), 400

    replacement = Product.query.filter_by(
        id=replacement_product_id,
        is_active=True
    ).first()

    if not replacement:
        return jsonify({
            "error": "Replacement product not found."
        }), 404

    # Use the replacement product's current price
    unit_price = float(
        replacement.discounted_price
        if replacement.discounted_price is not None
        else replacement.price
    )

    line_total = round(unit_price * quantity, 2)

    # Update the existing order item
    item.product_id = replacement.id
    item.product_name = replacement.name
    item.unit = replacement.unit
    item.quantity = quantity
    item.unit_price = unit_price
    item.line_total = line_total

    db.session.flush()

    # Recalculate subtotal from all order items
    subtotal = sum(
        float(order_item.line_total or 0)
        for order_item in order.items
    )

    order.subtotal = round(subtotal, 2)

    # Keep existing delivery fee and discount
    order.total_amount = round(
        order.subtotal
        + float(order.delivery_fee or 0)
        - float(order.discount_amount or 0),
        2
    )

    db.session.commit()

    return jsonify({
        "message": "Order item replaced successfully.",
        "order_id": order.id,
        "order_number": order.order_number,
        "item": {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "unit": item.unit,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "line_total": float(item.line_total),
            "stock_quantity": replacement.stock_quantity,
        },
        "subtotal": float(order.subtotal),
        "delivery_fee": float(order.delivery_fee or 0),
        "discount_amount": float(order.discount_amount or 0),
        "total_amount": float(order.total_amount),
    }), 200

# ── LIST CUSTOMERS ───────────────────────────────────────────
@admin_bp.route("/customers", methods=["GET"])
@admin_required
def list_customers(customer):
    """
    Query params:
      - search        : free-text searches name, email, phone, whatsapp
      - search_by     : name | phone | email | address | dietary | group (household) | last_order
      - search_q      : value for the specific search_by field
      - role          : customer | admin
      - is_active     : true | false
      - language      : english | telugu | hindi | tamil
      - dietary       : veg | nonveg | both
      - page          : default 1
      - per_page      : default 20
    """
    search     = request.args.get("search", "").strip()
    search_by  = request.args.get("search_by", "").strip()
    search_q   = request.args.get("search_q", "").strip()
    role       = request.args.get("role", "").strip()
    is_active  = request.args.get("is_active", "").strip()
    language   = request.args.get("language", "").strip()
    dietary    = request.args.get("dietary", "").strip()
    page       = int(request.args.get("page", 1))
    per_page   = min(int(request.args.get("per_page", 20)), 100)

    query = Customer.query

    # ── Generic free-text search (searches name, email, phone, whatsapp) ──
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                Customer.name.ilike(like),
                Customer.email.ilike(like),
                Customer.phone.ilike(like),
                Customer.whatsapp_number.ilike(like),
            )
        )

    # ── Targeted search_by + search_q ────────────────────────
    if search_by and search_q:
        like = f"%{search_q}%"

        if search_by == "name":
            query = query.filter(Customer.name.ilike(like))

        elif search_by == "phone":
            query = query.filter(
                db.or_(
                    Customer.phone.ilike(like),
                    Customer.whatsapp_number.ilike(like),
                )
            )

        elif search_by == "email":
            query = query.filter(Customer.email.ilike(like))

        elif search_by == "dietary":
            # exact match on dietary preference: veg | nonveg | both
            if search_q in VALID_DIET:
                query = query.filter(Customer.dietary_preference == search_q)
            else:
                # partial match fallback
                query = query.filter(Customer.dietary_preference.ilike(like))

        elif search_by == "address":
            # join through junction table to addresses
            query = query.join(
                CustomerAddress, CustomerAddress.customer_id == Customer.id
            ).join(
                Address, Address.id == CustomerAddress.address_id
            ).filter(
                db.or_(
                    Address.address_line1.ilike(like),
                    Address.address_line2.ilike(like),
                    Address.city.ilike(like),
                    Address.zip_code.ilike(like),
                )
            ).distinct()

        elif search_by == "group":
            # household / family group search
            try:
                household_id = int(search_q)
                query = query.filter(Customer.household_id == household_id)
            except ValueError:
                pass  # non-integer group id — return empty gracefully

        elif search_by == "last_order":
            # order-based search — join orders table if available
            try:
                from app.models.order import Order
                query = query.join(
                    Order, Order.customer_id == Customer.id
                ).filter(
                    db.or_(
                        Order.order_number.ilike(like),
                        Order.status.ilike(like),
                    )
                ).distinct()
            except Exception:
                pass  # orders model not yet migrated

    # ── Standard filters ─────────────────────────────────────
    if role and role in VALID_ROLES:
        query = query.filter(Customer.role == role)

    if is_active == "true":
        query = query.filter(Customer.is_active == True)
    elif is_active == "false":
        query = query.filter(Customer.is_active == False)

    if language and language in VALID_LANGUAGES:
        query = query.filter(Customer.preferred_language == language)

    if dietary and dietary in VALID_DIET:
        query = query.filter(Customer.dietary_preference == dietary)

    # ── Sorting ──────────────────────────────────────────────
    sort_by    = request.args.get("sort_by", "created_at").strip()
    sort_order = request.args.get("sort_order", "desc").strip()
    desc       = sort_order == "desc"

    if sort_by == "name":
        col = Customer.name
    elif sort_by == "orders_count":
        try:
            from app.models.order import Order
            order_count = db.select(
                Order.customer_id, db.func.count(Order.id).label("cnt")
            ).group_by(Order.customer_id).subquery()
            query = query.outerjoin(
                order_count, order_count.c.customer_id == Customer.id
            )
            query = query.order_by(
                db.desc(order_count.c.cnt) if desc else db.asc(order_count.c.cnt)
            ).order_by(Customer.id)
        except Exception:
            query = query.order_by(Customer.id.desc() if desc else Customer.id.asc())
    else:
        col = Customer.created_at

    if sort_by != "orders_count":
        query = query.order_by(col.desc() if desc else col.asc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "customers": [c.to_dict() for c in paginated.items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": paginated.total,
            "pages": paginated.pages,
            "has_next": paginated.has_next,
            "has_prev": paginated.has_prev,
        },
    }), 200


# ── GET ONE CUSTOMER ─────────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>", methods=["GET"])
@admin_required
def get_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    return jsonify({"customer": target.to_dict(include_addresses=True)}), 200


# ── EDIT CUSTOMER ────────────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>", methods=["PUT"])
@admin_required
def edit_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": "Name cannot be empty."}), 400
        target.name = name

    if "phone" in data:
        phone = data["phone"].strip()
        clash = Customer.query.filter(
            Customer.phone == phone, Customer.id != customer_id
        ).first()
        if clash:
            return jsonify({"error": "Phone already in use."}), 409
        target.phone = phone

    if "whatsapp_number" in data:
        target.whatsapp_number = data["whatsapp_number"].strip()

    if "email" in data:
        email = data["email"].strip().lower()
        clash = Customer.query.filter(
            Customer.email == email, Customer.id != customer_id
        ).first()
        if clash:
            return jsonify({"error": "Email already in use."}), 409
        target.email = email

    if "preferred_language" in data:
        if data["preferred_language"] in VALID_LANGUAGES:
            target.preferred_language = data["preferred_language"]

    if "dietary_preference" in data:
        if data["dietary_preference"] in VALID_DIET:
            target.dietary_preference = data["dietary_preference"]

    if "default_order_type" in data:
        if data["default_order_type"] in VALID_ORDER_TYPE:
            target.default_order_type = data["default_order_type"]

    db.session.commit()
    return jsonify({
        "message": "Customer updated.",
        "customer": target.to_dict(),
    }), 200


# ── DEACTIVATE ───────────────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>/deactivate", methods=["PUT"])
@admin_required
def deactivate_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot deactivate your own account."}), 400

    target.is_active = False
    from app.models.session import Session
    Session.query.filter_by(
        customer_id=target.id, is_active=True
    ).update({"is_active": False})
    db.session.commit()

    return jsonify({
        "message": f"Customer '{target.name}' deactivated.",
        "customer": target.to_dict(),
    }), 200


# ── ACTIVATE ─────────────────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>/activate", methods=["PUT"])
@admin_required
def activate_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    target.is_active = True
    db.session.commit()

    return jsonify({
        "message": f"Customer '{target.name}' activated.",
        "customer": target.to_dict(),
    }), 200


# ── CHANGE ROLE ──────────────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>/role", methods=["PUT"])
@admin_required
def change_role(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot change your own role."}), 400

    data = request.get_json(silent=True) or {}
    new_role = data.get("role", "").strip()

    if new_role not in VALID_ROLES:
        return jsonify({"error": f"Role must be one of: {VALID_ROLES}"}), 400

    target.role = new_role
    db.session.commit()

    return jsonify({
        "message": f"Role updated to '{new_role}'.",
        "customer": target.to_dict(),
    }), 200


# ── CUSTOMER ADDRESSES ───────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>/addresses", methods=["GET"])
@admin_required
def get_customer_addresses(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    links = CustomerAddress.query.filter_by(customer_id=customer_id).all()
    return jsonify({
        "customer_id": customer_id,
        "customer_name": target.name,
        "addresses": [link.to_dict() for link in links],
    }), 200


# ── CUSTOMER ORDERS ──────────────────────────────────────────
@admin_bp.route("/customers/<int:customer_id>/orders", methods=["GET"])
@admin_required
def get_customer_orders(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    try:
        from app.models.order import Order
        orders = Order.query.filter_by(
            customer_id=customer_id
        ).order_by(Order.created_at.desc()).all()
        orders_data = [o.to_dict() for o in orders]
    except Exception:
        orders_data = []

    return jsonify({
        "customer_id": customer_id,
        "customer_name": target.name,
        "total_orders": len(orders_data),
        "orders": orders_data,
    }), 200


# ── DELETE CUSTOMER (hard delete) ────────────────────────────
@admin_bp.route("/customers/<int:customer_id>", methods=["DELETE"])
@admin_required
def delete_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot delete your own account."}), 400

    try:
        from app.models.order import Order
        has_orders = Order.query.filter_by(customer_id=customer_id).count() > 0
    except Exception:
        has_orders = False

    if has_orders:
        return jsonify({
            "error": "Customer has existing orders. Use deactivate instead."
        }), 400

    db.session.delete(target)
    db.session.commit()
    return jsonify({"message": f"Customer '{target.name}' deleted."}), 200


# ── DASHBOARD STATS ──────────────────────────────────────────
@admin_bp.route("/stats/customers", methods=["GET"])
@admin_required
def customer_stats(customer):
    total    = Customer.query.count()
    active   = Customer.query.filter_by(is_active=True).count()
    inactive = Customer.query.filter_by(is_active=False).count()
    verified = Customer.query.filter_by(is_verified=True).count()
    admins   = Customer.query.filter_by(role="admin").count()

    by_language = db.session.query(
        Customer.preferred_language,
        db.func.count(Customer.id)
    ).group_by(Customer.preferred_language).all()

    return jsonify({
        "total_customers": total,
        "active": active,
        "inactive": inactive,
        "verified": verified,
        "admins": admins,
        "by_language": {lang: count for lang, count in by_language},
    }), 200


# ── SEARCH INSIGHTS ──────────────────────────────────────────
@admin_bp.route("/search-logs", methods=["GET"])
@admin_required
def search_logs(customer):
    """
    What customers actually searched for and whether it resolved.
    ?only_failed=true surfaces the actionable rows (queries that found
    nothing → those are the missing aliases/typos).
    """
    from app.models.search_log import SearchLog

    only_failed = request.args.get("only_failed", "").lower() == "true"
    try:
        limit = min(int(request.args.get("limit", 50)), 200)
    except ValueError:
        limit = 50

    q = SearchLog.query
    if only_failed:
        q = q.filter_by(result_found=False)
    q = q.order_by(SearchLog.searched_at.desc()).limit(limit)

    logs = q.all()
    return jsonify({
        "results": [log.to_dict() for log in logs],
    }), 200


@admin_bp.route("/search-terms", methods=["POST"])
@admin_required
def add_search_term(customer):
    """
    Add a missing search term to a product — the action side of the
    search-logs view: admin sees a failed query, picks the product, and
    adds it as official/alias/regional/typo/hashtag.
    """
    from app.models.product import Product
    from app.models.search_term import SearchTerm

    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    search_term = (data.get("search_term") or "").strip()
    term_type = data.get("term_type")
    language = data.get("language")

    valid_types = ("official", "alias", "regional", "typo", "hashtag")
    if not product_id or not search_term or term_type not in valid_types:
        return jsonify({
            "error": f"product_id, search_term, and term_type (one of {valid_types}) are required"
        }), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    existing = SearchTerm.query.filter_by(
        product_id=product.id, search_term=search_term
    ).first()
    if existing:
        return jsonify({"message": "Term already exists for this product.", "added": False}), 200

    db.session.add(SearchTerm(
        product_id=product.id,
        search_term=search_term,
        term_type=term_type,
        language=language or None,
    ))
    db.session.commit()
    return jsonify({"added": True, "product_id": product.id, "search_term": search_term}), 201
