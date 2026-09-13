"""
PaymentSettings — singleton row holding the payment QR code and any
instructions shown to customers on their invoice. Deliberately
separate from SiteSettings/branding, since the QR is admin-managed
payment info, not a branding asset.
"""

from datetime import datetime, timezone
from app import db


class PaymentSettings(db.Model):
    __tablename__ = "payment_settings"

    id = db.Column(db.Integer, primary_key=True)

    # URL to the QR code image, same pattern as SiteSettings.logo_url —
    # the admin hosts/points to an image rather than uploading one
    # directly, consistent with how branding images already work.
    qr_code_url = db.Column(db.String(500), nullable=True)

    # Optional free text shown under the QR, e.g. "Pay to UPI ID:
    # store2home@okaxis" or "Zelle: Delivery Hub LLC".
    instructions = db.Column(db.Text, nullable=True)

    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "qr_code_url": self.qr_code_url,
            "instructions": self.instructions,
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at else None
            ),
        }