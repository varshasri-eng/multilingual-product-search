"""
Auth Routes
-----------
POST /api/auth/register       - create new customer account (with password)
POST /api/auth/login          - sign in with email/phone + password
POST /api/auth/forgot-password- request a password-reset link
POST /api/auth/reset-password - set a new password using the emailed token
POST /api/auth/logout         - invalidate session token
GET  /api/auth/me             - get current logged-in customer
"""

import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.customer import Customer
from app.models.session import Session
from app.models.reset_token import PasswordResetToken
from app.utils.auth import create_session, login_required
from app.utils.email import send_reset_email

auth_bp = Blueprint("auth", __name__)

VALID_LANGUAGES = {"english", "telugu", "hindi", "tamil"}
VALID_DIET = {"veg", "nonveg", "both"}
VALID_ORDER_TYPE = {"delivery", "pickup"}

MIN_PASSWORD_LENGTH = 8


def _password_error(password: str):
    if not password:
        return "Password is required."
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    return None


# ── REGISTER ─────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not name:
        return jsonify({"error": "Name is required."}), 400
    if not phone:
        return jsonify({"error": "Phone number is required."}), 400
    if not email:
        return jsonify({"error": "Email is required."}), 400

    password = data.get("password") or ""
    password_err = _password_error(password)
    if password_err:
        return jsonify({"error": password_err}), 400

    if Customer.query.filter_by(phone=phone).first():
        return jsonify({"error": "Phone number already registered."}), 409
    if Customer.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

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
        is_verified=True,
        is_active=True,
    )
    customer.set_password(password)

    db.session.add(customer)
    db.session.commit()

    return jsonify({
        "message": "Account created. You can now sign in with your password.",
        "customer_id": customer.id,
    }), 201


# ── LOGIN (password) ─────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or data.get("phone") or "").strip().lower()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Email/phone and password are required."}), 400

    customer = Customer.query.filter(
        (Customer.email == identifier) | (Customer.phone == identifier)
    ).first()

    if not customer or not customer.check_password(password):
        return jsonify({"error": "Invalid email/phone or password."}), 401

    # for admin accounts — pending/rejected cannot get a session
    if customer.role == "admin":
        if customer.admin_role == "pending":
            return jsonify({
                "error": "Your account is pending approval by an administrator."
            }), 403
        if customer.admin_role == "rejected":
            return jsonify({
                "error": "Your staff request was not approved. Contact your administrator."
            }), 403
        if customer.admin_role not in {"read", "write", "full", "superadmin"}:
            return jsonify({
                "error": "Account access is restricted."
            }), 403

    if not customer.is_active:
        return jsonify({"error": "Account is deactivated."}), 403

    token = create_session(customer.id)
    return jsonify({
        "message": "Login successful.",
        "token": token,
        "customer": customer.to_public_dict(),
    }), 200


# ── FORGOT PASSWORD ──────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or "").strip().lower()

    if not identifier:
        return jsonify({"error": "Email is required."}), 400

    customer = Customer.query.filter(
        (Customer.email == identifier) | (Customer.phone == identifier)
    ).first()

    # Always respond the same way — never reveal whether the email exists.
    if customer:
        token = secrets.token_urlsafe(32)
        expiry_minutes = current_app.config.get("RESET_TOKEN_EXPIRY_MINUTES", 60)
        db.session.add(PasswordResetToken(
            customer_id=customer.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
        ))
        db.session.commit()
        send_reset_email(customer, token)

    return jsonify({
        "message": "If an account exists for that email, a password-reset link has been sent."
    }), 200


# ── RESET PASSWORD ───────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("email") or "").strip().lower()
    token = (data.get("token") or "").strip()
    password = data.get("password") or ""

    if not identifier or not token:
        return jsonify({"error": "Email and reset token are required."}), 400

    password_err = _password_error(password)
    if password_err:
        return jsonify({"error": password_err}), 400

    customer = Customer.query.filter(
        (Customer.email == identifier) | (Customer.phone == identifier)
    ).first()
    if not customer:
        return jsonify({"error": "Invalid or expired reset link."}), 400

    reset = PasswordResetToken.query.filter_by(
        customer_id=customer.id, token=token, is_used=False
    ).first()
    if not reset or not reset.is_valid():
        return jsonify({"error": "Invalid or expired reset link."}), 400

    reset.is_used = True
    customer.set_password(password)
    customer.is_verified = True

    # invalidate all existing sessions so old logins are kicked out
    Session.query.filter_by(customer_id=customer.id, is_active=True).update(
        {"is_active": False}
    )
    db.session.commit()

    return jsonify({
        "message": "Password updated. You can now sign in with your new password."
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
