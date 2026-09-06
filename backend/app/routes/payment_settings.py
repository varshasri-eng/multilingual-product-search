"""
Payment Settings Routes
------------------------
GET    /api/payment-settings      - public: QR code + instructions for invoice payment
PUT    /api/payment-settings      - admin only: update qr_code_url/instructions directly
                                     (e.g. pointing at an externally-hosted image)
POST   /api/payment-settings/qr   - admin only: upload/replace the QR image file
DELETE /api/payment-settings/qr   - admin only: remove the current QR image

Registered ONCE at a single prefix, matching settings_bp's existing
pattern (see app/__init__.py: settings_bp is also registered once at
"/api/settings", with GET public and PUT admin-gated via the
@admin_required decorator on the same path) — not two separate
public/admin prefixes.

The uploaded QR always saves under a constant filename (qr_current.<ext>)
so re-uploading replaces it in place rather than accumulating files —
but the stored URL carries a `?v=<timestamp>` cache-buster so browsers
don't keep showing a stale cached image after a replace.
"""

import os
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.payment_settings import PaymentSettings
from app.utils.auth import admin_required

payment_settings_bp = Blueprint("payment_settings", __name__)

QR_UPLOAD_SUBDIR = os.path.join("static", "uploads", "payment_qr")
QR_ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
QR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _get_payment_settings():
    """Get or create the singleton payment-settings row."""
    s = PaymentSettings.query.get(1)
    if not s:
        s = PaymentSettings(id=1)
        db.session.add(s)
        db.session.commit()
    return s


def _qr_upload_dir():
    path = os.path.join(current_app.root_path, QR_UPLOAD_SUBDIR)
    os.makedirs(path, exist_ok=True)
    return path


@payment_settings_bp.route("", methods=["GET"])
def get_payment_settings():
    return jsonify(_get_payment_settings().to_dict()), 200


@payment_settings_bp.route("", methods=["PUT"])
@admin_required
def update_payment_settings(customer):
    """
    Direct-set qr_code_url/instructions. Still useful for pointing at
    an externally-hosted QR image (e.g. an imgur link) instead of
    uploading a file — the upload endpoint below is the normal path
    for "I have an image on my computer".
    """
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


@payment_settings_bp.route("/qr", methods=["POST"])
@admin_required
def upload_qr(customer):
    """
    Upload/replace the QR image. Always saves to the same filename
    (qr_current.<ext>) — any previously-uploaded QR under a different
    extension is removed first, so old files don't pile up.
    """
    file = request.files.get("qr")
    if not file or not file.filename:
        return jsonify({"error": "Please choose an image to upload."}), 400

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if "." in file.filename else ""
    )
    if ext not in QR_ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "QR image must be PNG, JPG, JPEG, or WEBP."
        }), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > QR_MAX_BYTES:
        return jsonify({"error": "QR image must be under 5MB."}), 400

    upload_dir = _qr_upload_dir()

    # Remove any previous QR under a different extension so replacing
    # a .png with a .jpg (etc.) doesn't leave the old file behind.
    for stale_ext in QR_ALLOWED_EXTENSIONS:
        stale_path = os.path.join(upload_dir, f"qr_current.{stale_ext}")
        if os.path.exists(stale_path):
            try:
                os.remove(stale_path)
            except OSError:
                pass

    filename = f"qr_current.{ext}"
    file.save(os.path.join(upload_dir, filename))

    s = _get_payment_settings()
    version = int(datetime.now(timezone.utc).timestamp())
    s.qr_code_url = f"/static/uploads/payment_qr/{filename}?v={version}"
    db.session.commit()

    return jsonify({
        "message": "QR code uploaded.",
        "settings": s.to_dict(),
    }), 200


@payment_settings_bp.route("/qr", methods=["DELETE"])
@admin_required
def delete_qr(customer):
    """Remove the current QR entirely (falls back to 'not configured')."""
    upload_dir = _qr_upload_dir()

    for stale_ext in QR_ALLOWED_EXTENSIONS:
        stale_path = os.path.join(upload_dir, f"qr_current.{stale_ext}")
        if os.path.exists(stale_path):
            try:
                os.remove(stale_path)
            except OSError:
                pass

    s = _get_payment_settings()
    s.qr_code_url = None
    db.session.commit()

    return jsonify({
        "message": "QR code removed.",
        "settings": s.to_dict(),
    }), 200