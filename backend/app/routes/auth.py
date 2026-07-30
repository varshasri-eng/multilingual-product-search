"""
Auth Routes
-----------
POST /api/auth/register      - create new customer account
POST /api/auth/login         - send OTP to email (phase 1 mock)
POST /api/auth/verify-otp    - verify OTP, return session token
POST /api/auth/logout        - invalidate session token
GET  /api/auth/me            - get current logged-in customer
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.customer import Customer
from app.models.session import Session
from app.utils.otp import create_otp, verify_otp, send_otp
from app.utils.auth import create_session, login_required

auth_bp = Blueprint("auth", __name__)

VALID_LANGUAGES = {"english", "telugu", "hindi", "tamil"}
VALID_DIET = {"veg", "nonveg", "both"}
VALID_ORDER_TYPE = {"delivery", "pickup"}


# ── REGISTER ─────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    # required fields
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not name:
        return jsonify({"error": "Name is required."}), 400
    if not phone:
        return jsonify({"error": "Phone number is required."}), 400
    if not email:
        return jsonify({"error": "Email is required."}), 400

    # duplicate checks
    if Customer.query.filter_by(phone=phone).first():
        return jsonify({"error": "Phone number already registered."}), 409
    if Customer.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

    # optional fields
    whatsapp = (data.get("whatsapp_number") or phone).strip()
    language = data.get("preferred_language", "english")
    if language not in VALID_LANGUAGES:
        language = "english"
    diet = data.get("dietary_preference", "veg")
    if diet not in VALID_DIET:
        diet = "veg"
    order_type = data.get("default_order_type", "delivery")
    if order_type not in VALID_ORDER_TYPE:
        order_type = "delivery"

    customer = Customer(
        name=name,
        phone=phone,
        email=email,
        whatsapp_number=whatsapp,
        preferred_language=language,
        dietary_preference=diet,
        default_order_type=order_type,
        role="customer",
        is_verified=False,
        is_active=True,
    )

    # optional password for admin-created accounts
    if data.get("password"):
        customer.set_password(data["password"])

    db.session.add(customer)
    db.session.commit()

    # send OTP immediately after registration
    code = create_otp(email)
    send_otp(email, code, channel="email")

    return jsonify({
        "message": "Account created. OTP sent to email.",
        "customer_id": customer.id,
        "otp_sent_to": email,
    }), 201


# ── LOGIN (request OTP) ──────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or data.get("phone") or "").strip().lower()

    if not identifier:
        return jsonify({"error": "Email or phone is required."}), 400

    # find customer by email or phone
    customer = Customer.query.filter(
        (Customer.email == identifier) | (Customer.phone == identifier)
    ).first()

    if not customer:
        return jsonify({"error": "No account found with that email or phone."}), 404
    if not customer.is_active:
        return jsonify({"error": "Account is deactivated."}), 403

    # use email as OTP identifier if available, else phone
    otp_target = customer.email or customer.phone
    code = create_otp(otp_target)
    send_otp(otp_target, code, channel="email")

    return jsonify({
        "message": "OTP sent.",
        "otp_sent_to": otp_target,
        "customer_id": customer.id,
    }), 200


# ── VERIFY OTP ───────────────────────────────────────────────
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp_route():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or data.get("phone") or "").strip().lower()
    code = (data.get("otp") or "").strip()

    if not identifier or not code:
        return jsonify({"error": "Email/phone and OTP are required."}), 400

    if not verify_otp(identifier, code):
        return jsonify({"error": "Invalid or expired OTP."}), 401

    # find customer
    customer = Customer.query.filter(
        (Customer.email == identifier) | (Customer.phone == identifier)
    ).first()

    if not customer:
        return jsonify({"error": "Customer not found."}), 404

    # mark verified
    customer.is_verified = True
    db.session.commit()

    # for admin accounts — block pending/rejected from getting a session
    if customer.role == "admin":
        if customer.admin_role == "pending":
            return jsonify({
                "error": "Your account is pending approval by an administrator."
            }), 403
        if customer.admin_role == "rejected":
            return jsonify({
                "error": "Your staff request was not approved. Contact your administrator."
            }), 403
        if customer.admin_role not in {"read", "write", "full"}:
            return jsonify({
                "error": "Account access is restricted."
            }), 403

    # create session
    token = create_session(customer.id)

    return jsonify({
        "message": "Login successful.",
        "token": token,
        "customer": customer.to_public_dict(),
    }), 200


# ── LOGOUT ───────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout(customer):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if " " in auth_header else ""
    session = Session.query.filter_by(token=token).first()
    if session:
        session.is_active = False
        db.session.commit()
    return jsonify({"message": "Logged out successfully."}), 200


# ── ME ───────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@login_required
def me(customer):
    return jsonify({"customer": customer.to_dict(include_addresses=True)}), 200
