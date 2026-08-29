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

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from app import db
from app.models.customer import Customer
from app.models.address import Address, CustomerAddress
from app.models.order import Order, OrderItem
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.product import Product
from app.models.delivery_rule import ProductDeliveryRule, VALID_RESTOCK_CYCLES
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
        ?ready_to_ship=true | false
            Filters on the computed readiness flag below — does NOT
            touch the DB, just filters the already-computed results.

    Readiness: stock is reserved for an order's items at the moment
    the order is placed (see orders.py), so "ready to ship" mostly
    reduces to "has anything changed since then that would block
    fulfillment" — a product got deactivated/deleted, or (rare, a
    concurrent-order race) stock went negative. It is NOT re-checking
    whether enough stock exists right now for this order's quantity,
    since that stock was already reserved at order time; a product
    still being active and having non-negative stock is what "still
    fulfillable" means at this point.
    """
    status = (request.args.get("status") or "").strip().lower()
    ready_param = (request.args.get("ready_to_ship") or "").strip().lower()

    query = Order.query

    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.created_at.desc()).all()

    results = []

    for order in orders:
        customer_obj = Customer.query.get(order.customer_id)

        items = []
        ready_to_ship = True

        for item in order.items:
            product = Product.query.get(item.product_id) if item.product_id else None

            fulfillable = bool(
                product
                and product.is_active
                and (
                    product.stock_quantity is None
                    or product.stock_quantity >= 0
                )
            )
            if not fulfillable:
                ready_to_ship = False

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
                "fulfillable": fulfillable,
            })

        if ready_param in {"true", "false"}:
            wants_ready = ready_param == "true"
            if ready_to_ship != wants_ready:
                continue

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
            "ready_to_ship": ready_to_ship,
            "invoice": order.invoice.to_dict() if order.invoice else None,
        })

    return jsonify({"results": results}), 200


# ── RAISE INVOICE ─────────────────────────────────────────────
@admin_bp.route("/orders/<int:order_id>/invoice", methods=["POST"])
@admin_required
def create_order_invoice(customer, order_id):
    """
    Create a new invoice for an order.

    This is only ever called from "Save Invoice" in the invoice editor
    for an order that does not yet have an invoice — never from
    "Edit Invoice" itself.

    Optionally accepts the invoice-specific discount and per-item tax
    settings the admin chose in the editor:

        {
            "discount_amount": 0,
            "items": [
                {"order_item_id": 123, "taxable": true, "tax_percentage": 9}
            ]
        }

    Any order item not present in "items" (or if "items"/the request
    body is omitted entirely) defaults to non-taxable with 0% tax, and
    discount defaults to 0. Tax settings here are invoice-specific and
    are never copied from — or written back to — the product's own
    tax configuration.
    """

    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Order not found."}), 404

    # Prevent duplicate invoices
    existing_invoice = Invoice.query.filter_by(order_id=order_id).first()

    if existing_invoice:
        return jsonify({
            "message": "Invoice already exists for this order.",
            "invoice": existing_invoice.to_dict(),
        }), 200

    data = request.get_json(silent=True) or {}

    subtotal = float(order.subtotal or 0)
    delivery_fee = float(order.delivery_fee or 0)

    # ── Discount ────────────────────────────────────────────
    discount_amount = data.get("discount_amount", 0)

    try:
        discount_amount = float(discount_amount)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Discount amount must be a number."
        }), 400

    if discount_amount < 0:
        return jsonify({
            "error": "Discount cannot be negative."
        }), 400

    if discount_amount > subtotal + delivery_fee:
        return jsonify({
            "error": "Discount cannot exceed the invoice amount."
        }), 400

    # ── Per-item tax settings submitted by the admin ─────────
    items_data = data.get("items")

    settings_by_order_item_id = {}

    if items_data is not None:
        if not isinstance(items_data, list):
            return jsonify({
                "error": "Invoice items must be a list."
            }), 400

        for item_data in items_data:
            order_item_id = item_data.get("order_item_id")

            if order_item_id is None:
                continue

            taxable = bool(item_data.get("taxable", False))

            try:
                tax_percentage = float(item_data.get("tax_percentage", 0))
            except (TypeError, ValueError):
                return jsonify({
                    "error": "Tax percentage must be a number."
                }), 400

            if tax_percentage < 0 or tax_percentage > 100:
                return jsonify({
                    "error": "Tax percentage must be between 0 and 100."
                }), 400

            settings_by_order_item_id[order_item_id] = {
                "taxable": taxable,
                "tax_percentage": tax_percentage if taxable else 0,
            }

    # Generate invoice number
    invoice_number = f"INV-{order.id:06d}"

    # Create invoice first
    invoice = Invoice(
        invoice_number=invoice_number,
        order_id=order.id,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount_amount=round(discount_amount, 2),
        tax_amount=0,
        total_amount=order.total_amount or 0,
        status="issued",
    )

    db.session.add(invoice)

    # Flush so invoice.id is available
    db.session.flush()

    tax_total = 0

    # Create invoice item snapshots, applying the submitted (or default)
    # tax settings for each order item.
    for order_item in order.items:

        settings = settings_by_order_item_id.get(order_item.id)

        if settings is not None:
            taxable = settings["taxable"]
            tax_percentage = settings["tax_percentage"]
        else:
            taxable = False
            tax_percentage = 0

        line_total = float(order_item.line_total or 0)

        tax_amount = (
            round(line_total * tax_percentage / 100, 2)
            if taxable
            else 0
        )

        tax_total += tax_amount

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            order_item_id=order_item.id,
            product_id=order_item.product_id,
            product_name=order_item.product_name,
            quantity=order_item.quantity,
            unit_price=order_item.unit_price or 0,
            line_total=line_total,
            taxable=taxable,
            tax_percentage=tax_percentage,
            tax_amount=tax_amount,
        )

        db.session.add(invoice_item)

    tax_total = round(tax_total, 2)

    # Invoice total = subtotal + delivery - discount + tax
    invoice.tax_amount = tax_total
    invoice.total_amount = round(
        subtotal
        + delivery_fee
        - float(invoice.discount_amount or 0)
        + tax_total,
        2,
    )

    db.session.commit()

    return jsonify({
        "message": "Invoice raised successfully.",
        "invoice": invoice.to_dict(),
    }), 201


@admin_bp.route("/orders/<int:order_id>/invoice", methods=["PUT"])
@admin_required
def update_order_invoice(customer, order_id):
    """
    Update invoice-specific tax settings and recalculate totals.
    Product tax settings are not modified.
    """

    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Order not found."}), 404

    invoice = Invoice.query.filter_by(order_id=order_id).first()

    if not invoice:
        return jsonify({"error": "Invoice not found for this order."}), 404

    data = request.get_json(silent=True) or {}
    
    discount_amount = data.get(
        "discount_amount",
        invoice.discount_amount or 0
    )

    try:
        discount_amount = float(discount_amount)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Discount amount must be a number."
        }), 400

    if discount_amount < 0:
        return jsonify({
            "error": "Discount cannot be negative."
        }), 400

    subtotal = float(invoice.subtotal or 0)
    delivery_fee = float(invoice.delivery_fee or 0)

    if discount_amount > subtotal + delivery_fee:
        return jsonify({
            "error": "Discount cannot exceed the invoice amount."
        }), 400

    invoice.discount_amount = round(discount_amount, 2)

    items_data = data.get("items")

    if not isinstance(items_data, list):
      return jsonify({
        "error": "Invoice items are required."
    }), 400

    invoice_items = InvoiceItem.query.filter_by(
        invoice_id=invoice.id
    ).all()

    submitted_ids = {
        item_data.get("id")
        for item_data in items_data
    }

    existing_ids = {item.id for item in invoice_items}

    if submitted_ids != existing_ids:
        return jsonify({
            "error": "Invoice items do not match the existing invoice."
        }), 400

    tax_total = 0

    for item_data in items_data:
        invoice_item = next(
            item for item in invoice_items
            if item.id == item_data.get("id")
        )

        taxable = bool(
            item_data.get("taxable", invoice_item.taxable)
        )

        try:
            tax_percentage = float(
                item_data.get(
                    "tax_percentage",
                    invoice_item.tax_percentage
                )
            )
        except (TypeError, ValueError):
            return jsonify({
                "error": "Tax percentage must be a number."
            }), 400

        if tax_percentage < 0 or tax_percentage > 100:
            return jsonify({
                "error": "Tax percentage must be between 0 and 100."
            }), 400

        invoice_item.taxable = taxable
        invoice_item.tax_percentage = (
            tax_percentage if taxable else 0
        )

        line_total = float(invoice_item.line_total or 0)

        invoice_item.tax_amount = (
            round(
                line_total
                * invoice_item.tax_percentage
                / 100,
                2
            )
            if invoice_item.taxable
            else 0
        )

        tax_total += invoice_item.tax_amount

    tax_total = round(tax_total, 2)

    invoice.tax_amount = tax_total

    invoice.total_amount = round(
        float(invoice.subtotal or 0)
        + float(invoice.delivery_fee or 0)
        - float(invoice.discount_amount or 0)
        + tax_total,
        2,
    )

    db.session.commit()

    return jsonify({
        "message": "Invoice updated successfully.",
        "invoice": invoice.to_dict(),
    }), 200


# ── VERIFY / REJECT PAYMENT (Phase 3) ─────────────────────────
# Acts on a customer's payment-proof submission (see orders.py's
# submit_payment_proof). Only valid from "payment_submitted" — an
# admin can't verify/reject an invoice the customer hasn't actually
# submitted proof for yet, and can't re-verify one already verified.
@admin_bp.route("/orders/<int:order_id>/invoice/verify", methods=["PUT"])
@admin_required
def verify_order_payment(customer, order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    invoice = order.invoice
    if not invoice:
        return jsonify({"error": "This order does not have an invoice."}), 404

    if invoice.status != "payment_submitted":
        return jsonify({
            "error": (
                "There is no pending payment submission to verify "
                f"(current status: {invoice.status})."
            )
        }), 400

    invoice.status = "payment_verified"
    invoice.paid_at = datetime.now(timezone.utc)
    invoice.payment_verified_by = customer.id
    invoice.payment_rejection_reason = None

    db.session.commit()

    return jsonify({
        "message": "Payment verified.",
        "invoice": invoice.to_dict(),
    }), 200


@admin_bp.route("/orders/<int:order_id>/invoice/reject", methods=["PUT"])
@admin_required
def reject_order_payment(customer, order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found."}), 404

    invoice = order.invoice
    if not invoice:
        return jsonify({"error": "This order does not have an invoice."}), 404

    if invoice.status != "payment_submitted":
        return jsonify({
            "error": (
                "There is no pending payment submission to reject "
                f"(current status: {invoice.status})."
            )
        }), 400

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip() or None

    invoice.status = "payment_rejected"
    invoice.payment_rejection_reason = reason

    db.session.commit()

    return jsonify({
        "message": "Payment rejected.",
        "invoice": invoice.to_dict(),
    }), 200


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

    # Restore stock for the removed item before deleting it — removing
    # an item from an order releases that stock back to inventory.
    if item.product_id:
        item_product = Product.query.get(item.product_id)
        if item_product and item_product.stock_quantity is not None:
            item_product.stock_quantity += item.quantity

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

    # Stock check against the replacement — same guard as a fresh
    # order, since this is effectively ordering a different product.
    if (
        replacement.stock_quantity is not None
        and quantity > replacement.stock_quantity
    ):
        return jsonify({
            "error": f"Only {replacement.stock_quantity} of "
                     f"'{replacement.name}' left in stock."
        }), 409

    # Use the replacement product's current price
    unit_price = float(
        replacement.discounted_price
        if replacement.discounted_price is not None
        else replacement.price
    )

    line_total = round(unit_price * quantity, 2)

    # Restore stock for the item being replaced before overwriting it
    # (its old product_id/quantity are about to be lost).
    if item.product_id:
        old_product = Product.query.get(item.product_id)
        if old_product and old_product.stock_quantity is not None:
            old_product.stock_quantity += item.quantity

    # Update the existing order item
    item.product_id = replacement.id
    item.product_name = replacement.name
    item.unit = replacement.unit
    item.quantity = quantity
    item.unit_price = unit_price
    item.line_total = line_total

    # Decrement stock for the newly-assigned product.
    replacement.stock_quantity = (
        replacement.stock_quantity - quantity
        if replacement.stock_quantity is not None
        else None
    )

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

# ── PRODUCT DELIVERY RULES ────────────────────────────────────
# Admin-controlled per-product restock/availability rules. Stock
# itself is untouched here — this only manages when a product is
# *expected* to become available again once it's out of stock (see
# utils/delivery.py for how these feed into the availability calc).
@admin_bp.route("/products/<int:product_id>/delivery-rule", methods=["GET"])
@admin_required
def get_delivery_rule(customer, product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    rule = ProductDeliveryRule.query.get(product_id)

    if not rule:
        # No rule configured yet — same defaults products.py's
        # availability endpoint already falls back to.
        return jsonify({
            "product_id": product_id,
            "restock_cycle": "none",
            "restock_day_of_week": None,
            "restock_day_of_month": None,
            "min_lead_days": 0,
            "updated_at": None,
        }), 200

    return jsonify(rule.to_dict()), 200


@admin_bp.route("/products/<int:product_id>/delivery-rule", methods=["PUT"])
@admin_required
def update_delivery_rule(customer, product_id):
    """
    Create or update a product's delivery/restock rule.

        {
            "restock_cycle": "weekly",       // weekly | monthly | none
            "restock_day_of_week": 3,        // 0=Sun..6=Sat, weekly only
            "restock_day_of_month": null,    // 1-31, monthly only
            "min_lead_days": 3
        }

    The irrelevant day field for the chosen cycle is cleared, not just
    ignored, so a stale value can't silently linger and get picked up
    later if restock_cycle changes back.
    """
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found."}), 404

    data = request.get_json(silent=True) or {}

    restock_cycle = data.get("restock_cycle", "none")
    if restock_cycle not in VALID_RESTOCK_CYCLES:
        return jsonify({
            "error": f"restock_cycle must be one of {sorted(VALID_RESTOCK_CYCLES)}"
        }), 400

    restock_day_of_week = data.get("restock_day_of_week")
    restock_day_of_month = data.get("restock_day_of_month")

    if restock_cycle == "weekly":
        if restock_day_of_week is None:
            return jsonify({
                "error": "restock_day_of_week is required for a weekly cycle."
            }), 400
        try:
            restock_day_of_week = int(restock_day_of_week)
        except (TypeError, ValueError):
            return jsonify({
                "error": "restock_day_of_week must be an integer 0-6 (0=Sunday)."
            }), 400
        if not (0 <= restock_day_of_week <= 6):
            return jsonify({
                "error": "restock_day_of_week must be between 0 (Sunday) and 6 (Saturday)."
            }), 400
        restock_day_of_month = None

    elif restock_cycle == "monthly":
        if restock_day_of_month is None:
            return jsonify({
                "error": "restock_day_of_month is required for a monthly cycle."
            }), 400
        try:
            restock_day_of_month = int(restock_day_of_month)
        except (TypeError, ValueError):
            return jsonify({
                "error": "restock_day_of_month must be an integer 1-31."
            }), 400
        if not (1 <= restock_day_of_month <= 31):
            return jsonify({
                "error": "restock_day_of_month must be between 1 and 31."
            }), 400
        restock_day_of_week = None

    else:  # "none"
        restock_day_of_week = None
        restock_day_of_month = None

    min_lead_days = data.get("min_lead_days", 0)
    try:
        min_lead_days = int(min_lead_days)
    except (TypeError, ValueError):
        return jsonify({"error": "min_lead_days must be a non-negative integer."}), 400
    if min_lead_days < 0:
        return jsonify({"error": "min_lead_days must be a non-negative integer."}), 400

    rule = ProductDeliveryRule.query.get(product_id)
    if not rule:
        rule = ProductDeliveryRule(product_id=product_id)
        db.session.add(rule)

    rule.restock_cycle = restock_cycle
    rule.restock_day_of_week = restock_day_of_week
    rule.restock_day_of_month = restock_day_of_month
    rule.min_lead_days = min_lead_days

    db.session.commit()

    return jsonify({
        "message": "Delivery rule updated.",
        "rule": rule.to_dict(),
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