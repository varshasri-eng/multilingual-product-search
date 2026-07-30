"""
Customer Routes
---------------
GET    /api/customers/profile              - get own profile
PUT    /api/customers/profile              - update own profile

GET    /api/customers/addresses            - list own addresses
POST   /api/customers/addresses            - add new address
PUT    /api/customers/addresses/<id>       - update an address
DELETE /api/customers/addresses/<id>       - delete an address
PUT    /api/customers/addresses/<id>/default - set as default
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.address import Address, CustomerAddress
from app.models.customer import Customer
from app.utils.auth import login_required

customers_bp = Blueprint("customers", __name__)

VALID_LANGUAGES  = {"english", "telugu", "hindi", "tamil"}
VALID_DIET       = {"veg", "nonveg", "both"}
VALID_ORDER_TYPE = {"delivery", "pickup"}
VALID_ZIP_CODES  = {"95330", "95391"}   # Lathrop and Mountain House only


# ── PROFILE ──────────────────────────────────────────────────

@customers_bp.route("/profile", methods=["GET"])
@login_required
def get_profile(customer):
    return jsonify({"customer": customer.to_dict(include_addresses=True)}), 200


@customers_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile(customer):
    data = request.get_json(silent=True) or {}

    # updatable fields — never allow role or is_active from this endpoint
    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": "Name cannot be empty."}), 400
        customer.name = name

    if "whatsapp_number" in data:
        customer.whatsapp_number = data["whatsapp_number"].strip()

    if "email" in data:
        email = data["email"].strip().lower()
        existing = Customer.query.filter(
            Customer.email == email, Customer.id != customer.id
        ).first()
        if existing:
            return jsonify({"error": "Email already in use."}), 409
        customer.email = email

    if "phone" in data:
        phone = data["phone"].strip()
        existing = Customer.query.filter(
            Customer.phone == phone, Customer.id != customer.id
        ).first()
        if existing:
            return jsonify({"error": "Phone already in use."}), 409
        customer.phone = phone

    if "preferred_language" in data:
        lang = data["preferred_language"]
        if lang in VALID_LANGUAGES:
            customer.preferred_language = lang

    if "dietary_preference" in data:
        diet = data["dietary_preference"]
        if diet in VALID_DIET:
            customer.dietary_preference = diet

    if "default_order_type" in data:
        ot = data["default_order_type"]
        if ot in VALID_ORDER_TYPE:
            customer.default_order_type = ot

    db.session.commit()
    return jsonify({
        "message": "Profile updated.",
        "customer": customer.to_dict(),
    }), 200


# ── ADDRESSES ────────────────────────────────────────────────

@customers_bp.route("/addresses", methods=["GET"])
@login_required
def list_addresses(customer):
    links = CustomerAddress.query.filter_by(customer_id=customer.id).all()
    return jsonify({"addresses": [link.to_dict() for link in links]}), 200


@customers_bp.route("/addresses", methods=["POST"])
@login_required
def add_address(customer):
    data = request.get_json(silent=True) or {}

    address_line1 = (data.get("address_line1") or "").strip()
    city          = (data.get("city") or "").strip()
    zip_code      = (data.get("zip_code") or "").strip()

    if not address_line1:
        return jsonify({"error": "address_line1 is required."}), 400
    if not city:
        return jsonify({"error": "city is required."}), 400
    if not zip_code:
        return jsonify({"error": "zip_code is required."}), 400

    # delivery zone enforcement
    if zip_code not in VALID_ZIP_CODES:
        return jsonify({
            "error": f"Sorry, we only deliver to Lathrop (95330) and "
                     f"Mountain House (95391). Got: {zip_code}"
        }), 422

    address = Address(
        address_line1=address_line1,
        address_line2=(data.get("address_line2") or "").strip() or None,
        city=city,
        state=data.get("state", "CA"),
        zip_code=zip_code,
        delivery_notes=(data.get("delivery_notes") or "").strip() or None,
    )
    db.session.add(address)
    db.session.flush()   # get address.id before commit

    # if this is the first address, make it default
    existing_count = CustomerAddress.query.filter_by(
        customer_id=customer.id
    ).count()
    is_default = (existing_count == 0) or bool(data.get("is_default"))

    # if marking as default, unset previous default
    if is_default:
        CustomerAddress.query.filter_by(
            customer_id=customer.id, is_default=True
        ).update({"is_default": False})

    link = CustomerAddress(
        customer_id=customer.id,
        address_id=address.id,
        label=data.get("label", "Home"),
        is_default=is_default,
    )
    db.session.add(link)
    db.session.commit()

    return jsonify({
        "message": "Address added.",
        "address": link.to_dict(),
    }), 201


@customers_bp.route("/addresses/<int:link_id>", methods=["PUT"])
@login_required
def update_address(customer, link_id):
    link = CustomerAddress.query.filter_by(
        id=link_id, customer_id=customer.id
    ).first()
    if not link:
        return jsonify({"error": "Address not found."}), 404

    data = request.get_json(silent=True) or {}
    addr = link.address

    if "address_line1" in data:
        addr.address_line1 = data["address_line1"].strip()
    if "address_line2" in data:
        addr.address_line2 = data["address_line2"].strip() or None
    if "city" in data:
        addr.city = data["city"].strip()
    if "state" in data:
        addr.state = data["state"].strip()
    if "zip_code" in data:
        zip_code = data["zip_code"].strip()
        if zip_code not in VALID_ZIP_CODES:
            return jsonify({
                "error": f"ZIP code {zip_code} is outside our delivery zones."
            }), 422
        addr.zip_code = zip_code
    if "delivery_notes" in data:
        addr.delivery_notes = data["delivery_notes"].strip() or None
    if "label" in data:
        link.label = data["label"]

    db.session.commit()
    return jsonify({"message": "Address updated.", "address": link.to_dict()}), 200


@customers_bp.route("/addresses/<int:link_id>", methods=["DELETE"])
@login_required
def delete_address(customer, link_id):
    link = CustomerAddress.query.filter_by(
        id=link_id, customer_id=customer.id
    ).first()
    if not link:
        return jsonify({"error": "Address not found."}), 404

    was_default = link.is_default
    address_id  = link.address_id

    db.session.delete(link)
    db.session.commit()

    # if the deleted address was default, promote the next one
    if was_default:
        next_link = CustomerAddress.query.filter_by(
            customer_id=customer.id
        ).first()
        if next_link:
            next_link.is_default = True
            db.session.commit()

    # if no other customer uses this address, delete it too
    other_links = CustomerAddress.query.filter_by(address_id=address_id).count()
    if other_links == 0:
        Address.query.filter_by(id=address_id).delete()
        db.session.commit()

    return jsonify({"message": "Address removed."}), 200


@customers_bp.route("/addresses/<int:link_id>/default", methods=["PUT"])
@login_required
def set_default_address(customer, link_id):
    link = CustomerAddress.query.filter_by(
        id=link_id, customer_id=customer.id
    ).first()
    if not link:
        return jsonify({"error": "Address not found."}), 404

    # unset all
    CustomerAddress.query.filter_by(
        customer_id=customer.id, is_default=True
    ).update({"is_default": False})

    link.is_default = True
    db.session.commit()

    return jsonify({"message": "Default address updated.", "address": link.to_dict()}), 200
