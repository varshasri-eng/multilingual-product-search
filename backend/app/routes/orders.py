"""
Order Routes
------------
GET  /api/orders              - list current customer's orders
GET  /api/orders/<id>         - order detail (owner only)
POST /api/orders              - place an order (authenticated)
POST /api/orders/guest        - place a guest order (no auth)
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.address import CustomerAddress
from app.utils.auth import login_required

orders_bp = Blueprint("orders", __name__)

VALID_ORDER_TYPES = {"delivery", "pickup"}
VALID_TIME_SLOTS = {"Morning 9-12", "Afternoon 12-4", "Evening 4-7"}
DEFAULT_DELIVERY_FEE = 2.99


def _delivery_fee_for(zip_code):
    try:
        from app.models.delivery_zone import DeliveryZone
        zone = DeliveryZone.query.filter_by(zip_code=zip_code, is_active=True).first()
        if zone and zone.delivery_fee is not None:
            return float(zone.delivery_fee)
    except Exception:
        pass
    return DEFAULT_DELIVERY_FEE


@orders_bp.route("", methods=["GET"])
@login_required
def list_orders(customer):
    orders = (
        Order.query.filter_by(customer_id=customer.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify({
        "count": len(orders),
        "orders": [o.to_dict() for o in orders],
    }), 200


@orders_bp.route("/<int:order_id>", methods=["GET"])
@login_required
def get_order(customer, order_id):
    order = Order.query.filter_by(
        id=order_id, customer_id=customer.id
    ).first()
    if not order:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"order": order.to_dict()}), 200


@orders_bp.route("", methods=["POST"])
@login_required
def create_order(customer):
    data = request.get_json(silent=True) or {}

    raw_items = data.get("items") or []
    if not raw_items:
        return jsonify({"error": "Your cart is empty."}), 400

    order_type = data.get("order_type", customer.default_order_type or "delivery")
    if order_type not in VALID_ORDER_TYPES:
        return jsonify({"error": "order_type must be delivery or pickup."}), 400

    # ── build order items from cart ────────────────────────────
    items = []
    subtotal = 0.0
    for entry in raw_items:
        product_id = entry.get("product_id")
        quantity = entry.get("quantity", 1)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            quantity = 0
        if quantity <= 0:
            return jsonify({"error": "Quantities must be positive integers."}), 400

        product = Product.query.filter_by(
            id=product_id, is_active=True
        ).first()
        if not product:
            return jsonify({"error": f"Product {product_id} not found."}), 404

        unit_price = float(
            product.discounted_price if product.discounted_price else product.price
        )
        line_total = round(unit_price * quantity, 2)
        subtotal = round(subtotal + line_total, 2)

        items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            unit=product.unit,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
        ))

    # ── address + delivery fee ────────────────────────────────
    address_id = None
    delivery_fee = 0.0
    if order_type == "delivery":
        address_id = data.get("address_id")
        if not address_id:
            return jsonify({"error": "Please choose a delivery address."}), 400

        link = CustomerAddress.query.filter_by(
            id=address_id, customer_id=customer.id
        ).first()
        if not link or not link.address:
            return jsonify({"error": "Delivery address not found."}), 404

        address_id = link.address_id
        delivery_fee = _delivery_fee_for(link.address.zip_code)

    discount = round(float(data.get("discount_amount") or 0), 2)
    total = round(subtotal + delivery_fee - discount, 2)

    # ── scheduling (optional) ─────────────────────────────────
    requested_date = None
    requested_time_slot = data.get("requested_time_slot") or None
    if requested_time_slot and requested_time_slot not in VALID_TIME_SLOTS:
        return jsonify({"error": "Invalid time slot."}), 400

    date_str = data.get("requested_date")
    if date_str:
        try:
            from datetime import date as _date
            requested_date = _date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"error": "Invalid requested_date. Use YYYY-MM-DD."}), 400

    order = Order(
        customer_id=customer.id,
        address_id=address_id,
        order_type=order_type,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount_amount=discount,
        total_amount=total,
        requested_date=requested_date,
        requested_time_slot=requested_time_slot,
        notes=(data.get("notes") or "").strip() or None,
        status="pending",
        items=items,
    )
    db.session.add(order)
    db.session.commit()

    # fallback order number if the DB trigger isn't present
    if not order.order_number:
        order.order_number = f"S2H-{10000 + order.id}"
        db.session.commit()

    return jsonify({
        "message": "Order placed successfully.",
        "order": order.to_dict(),
    }), 201


# ── GUEST ORDER (no auth required) ──────────────────────────
@orders_bp.route("/guest", methods=["POST"])
def create_guest_order():
    data = request.get_json(silent=True) or {}

    raw_items = data.get("items") or []
    if not raw_items:
        return jsonify({"error": "Your cart is empty."}), 400

    # ── guest info ─────────────────────────────────────────
    guest_name  = (data.get("guest_name") or "").strip()
    guest_email = (data.get("guest_email") or "").strip()
    guest_phone = (data.get("guest_phone") or "").strip()

    if not guest_name:
        return jsonify({"error": "Name is required."}), 400
    if not guest_email:
        return jsonify({"error": "Email is required."}), 400

    # ── find or create guest customer ──────────────────────
    from app.models.customer import Customer
    customer = Customer.query.filter_by(email=guest_email).first()
    if not customer:
        # phone is required+unique; generate a placeholder for guests
        guest_phone = guest_phone or f"guest-{guest_email.split('@')[0]}"
        # ensure uniqueness
        if Customer.query.filter_by(phone=guest_phone).first():
            import secrets
            guest_phone = f"guest-{secrets.token_hex(6)}"
        customer = Customer(
            name=guest_name,
            email=guest_email,
            phone=guest_phone,
            role="customer",
            is_active=True,
        )
        db.session.add(customer)
        db.session.flush()

    order_type = data.get("order_type", "delivery")
    if order_type not in VALID_ORDER_TYPES:
        return jsonify({"error": "order_type must be delivery or pickup."}), 400

    # ── build order items from cart ────────────────────────
    items = []
    subtotal = 0.0
    for entry in raw_items:
        product_id = entry.get("product_id")
        quantity = entry.get("quantity", 1)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            quantity = 0
        if quantity <= 0:
            return jsonify({"error": "Quantities must be positive integers."}), 400

        product = Product.query.filter_by(id=product_id, is_active=True).first()
        if not product:
            return jsonify({"error": f"Product {product_id} not found."}), 404

        unit_price = float(
            product.discounted_price if product.discounted_price else product.price
        )
        line_total = round(unit_price * quantity, 2)
        subtotal = round(subtotal + line_total, 2)

        items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            unit=product.unit,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
        ))

    # ── address + delivery fee ────────────────────────────
    address_id = None
    delivery_fee = 0.0
    if order_type == "delivery":
        addr_line1 = (data.get("address_line1") or "").strip()
        city       = (data.get("city") or "").strip()
        state      = (data.get("state") or "CA").strip()
        zip_code   = (data.get("zip_code") or "").strip()

        if not addr_line1 or not city or not zip_code:
            return jsonify({"error": "Full delivery address is required."}), 400

        from app.models.address import Address as AddressModel
        addr = AddressModel(
            address_line1=addr_line1,
            address_line2=(data.get("address_line2") or "").strip() or None,
            city=city,
            state=state,
            zip_code=zip_code,
            delivery_notes=(data.get("delivery_notes") or "").strip() or None,
        )
        db.session.add(addr)
        db.session.flush()

        address_id = addr.id
        delivery_fee = _delivery_fee_for(zip_code)

    discount = round(float(data.get("discount_amount") or 0), 2)
    total = round(subtotal + delivery_fee - discount, 2)

    # ── scheduling (optional) ─────────────────────────────
    requested_date = None
    requested_time_slot = data.get("requested_time_slot") or None
    if requested_time_slot and requested_time_slot not in VALID_TIME_SLOTS:
        return jsonify({"error": "Invalid time slot."}), 400

    date_str = data.get("requested_date")
    if date_str:
        try:
            from datetime import date as _date
            requested_date = _date.fromisoformat(date_str)
        except ValueError:
            return jsonify({"error": "Invalid requested_date. Use YYYY-MM-DD."}), 400

    order = Order(
        customer_id=customer.id,
        address_id=address_id,
        order_type=order_type,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount_amount=discount,
        total_amount=total,
        requested_date=requested_date,
        requested_time_slot=requested_time_slot,
        notes=(data.get("notes") or "").strip() or None,
        status="pending",
        items=items,
    )
    db.session.add(order)
    db.session.commit()

    if not order.order_number:
        order.order_number = f"S2H-{10000 + order.id}"
        db.session.commit()

    return jsonify({
        "message": "Order placed successfully.",
        "order": order.to_dict(),
    }), 201
