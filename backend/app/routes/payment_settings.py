"""
Payment Settings Routes
------------------------
GET  /api/payment-settings   - public: QR code + instructions for invoice payment
PUT  /api/payment-settings   - admin only: update QR code URL + instructions

Registered ONCE at a single prefix, matching settings_bp's existing
pattern (see app/__init__.py: settings_bp is also registered once at
"/api/settings", with GET public and PUT admin-gated via the
@admin_required decorator on the same path) — not two separate
public/admin prefixes.
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.payment_settings import PaymentSettings
from app.utils.auth import admin_required

payment_settings_bp = Blueprint("payment_settings", __name__)


def _get_payment_settings():
    """Get or create the singleton payment-settings row."""
    s = PaymentSettings.query.get(1)
    if not s:
        s = PaymentSettings(id=1)
        db.session.add(s)
        db.session.commit()
    return s


@payment_settings_bp.route("", methods=["GET"])
def get_payment_settings():
    return jsonify(_get_payment_settings().to_dict()), 200


@payment_settings_bp.route("", methods=["PUT"])
@admin_required
def update_payment_settings(customer):
    data = request.get_json(silent=True) or {}
    s = _get_payment_settings()

    if "qr_code_url" in data:
        s.qr_code_url = (data["qr_code_url"] or "").strip() or None
    if "instructions" in data:
        s.instructions = (data["instructions"] or "").strip() or None

    db.session.commit()
    return jsonify({
        "message": "Payment settings updated.",
        "settings": s.to_dict(),
    }), 200