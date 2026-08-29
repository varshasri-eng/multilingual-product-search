import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import request, jsonify, current_app
from app import db
from app.models.session import Session
from app.models.customer import Customer

# ── Permission hierarchy ─────────────────────────────────────
# superadmin > full > write > read
PERMISSION_LEVELS = {
    "read":  1,
    "write": 2,
    "full":  3,
    "superadmin": 4,
}


def generate_token():
    return secrets.token_urlsafe(32)


def create_session(customer_id):
    token = generate_token()
    expiry_days = current_app.config.get("SESSION_EXPIRY_DAYS", 30)
    session = Session(
        customer_id=customer_id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=expiry_days),
    )
    db.session.add(session)
    db.session.commit()
    return token


def get_current_customer():
    """Extract and validate bearer token from request headers."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    session = Session.query.filter_by(token=token, is_active=True).first()
    if not session or not session.is_valid():
        return None
    return Customer.query.get(session.customer_id)


# ── login_required ───────────────────────────────────────────
def login_required(f):
    """Any authenticated customer."""
    @wraps(f)
    def decorated(*args, **kwargs):
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        if not customer.is_active:
            return jsonify({"error": "Account is deactivated."}), 403
        return f(*args, customer=customer, **kwargs)
    return decorated


# ── admin_required ───────────────────────────────────────────
def admin_required(f):
    """
    Any active staff member (read / write / full).
    Use permission_required('write') or permission_required('full')
    for more specific checks.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        customer = get_current_customer()
        if not customer:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        if not customer.is_active:
            return jsonify({"error": "Account is deactivated."}), 403
        if customer.role != "admin":
            return jsonify({"error": "Admin access required."}), 403
        if customer.admin_role not in PERMISSION_LEVELS:
            return jsonify({"error": "Your account is pending approval."}), 403
        return f(*args, customer=customer, **kwargs)
    return decorated


# ── permission_required ──────────────────────────────────────
def permission_required(min_permission: str):
    """
    Decorator factory — requires a minimum permission level.

    Usage:
        @permission_required("read")   — read, write, or full
        @permission_required("write")  — write or full only
        @permission_required("full")   — full only

    Permission hierarchy: read < write < full
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            customer = get_current_customer()
            if not customer:
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            if not customer.is_active:
                return jsonify({"error": "Account is deactivated."}), 403
            if customer.role != "admin":
                return jsonify({"error": "Admin access required."}), 403

            # check permission level
            customer_level = PERMISSION_LEVELS.get(customer.admin_role, 0)
            required_level = PERMISSION_LEVELS.get(min_permission, 99)

            if customer_level < required_level:
                return jsonify({
                    "error": f"Insufficient permissions. "
                             f"Requires '{min_permission}' access. "
                             f"Your level: '{customer.admin_role or 'pending'}'."
                }), 403

            return f(*args, customer=customer, **kwargs)
        return decorated
    return decorator
