from datetime import datetime, timezone

from flask import request
from app import db

VALID_INVOICE_STATUSES = {
    "issued",
    "payment_submitted",
    "payment_verified",
    "payment_rejected",
}


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)

    invoice_number = db.Column(
        db.String(30),
        unique=True,
        nullable=False
    )

    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    subtotal = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    delivery_fee = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    discount_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )
    
    tax_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    total_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    # issued -> payment_submitted -> payment_verified | payment_rejected
    # payment_rejected -> payment_submitted (customer resubmits)
    status = db.Column(
        db.String(20),
        nullable=False,
        default="issued"
    )

    issued_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Set when an admin verifies a payment submission (see
    # payment_verified_by). Kept as "paid_at" rather than adding a
    # separate payment_verified_at column, since they mean the same
    # thing here: the moment the admin confirmed the payment.
    paid_at = db.Column(
        db.DateTime(timezone=True)
    )

    processed_at = db.Column(
        db.DateTime(timezone=True)
    )

    # ── Payment proof (Phase 3) ──────────────────────────────
    # Path/URL to the customer-uploaded screenshot, e.g.
    # "/static/uploads/payment_screenshots/invoice_12_....jpg".
    # Overwritten on resubmission after a rejection.
    payment_screenshot_path = db.Column(
        db.String(500),
        nullable=True,
    )

    # Free-text note from the customer alongside (or instead of) a
    # screenshot — transaction ID, "paid via Zelle", etc.
    payment_note = db.Column(
        db.Text,
        nullable=True,
    )

    # When the customer last submitted payment proof. Updated again
    # on resubmission after a rejection.
    payment_submitted_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )

    # Which admin verified the payment (paired with paid_at above).
    payment_verified_by = db.Column(
        db.Integer,
        db.ForeignKey("customers.id"),
        nullable=True,
    )

    # Set when an admin rejects a payment submission. Cleared on
    # resubmission.
    payment_rejection_reason = db.Column(
        db.Text,
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    order = db.relationship(
        "Order",
        backref=db.backref("invoice", uselist=False)
    )

    items = db.relationship(
        "InvoiceItem",
        back_populates="invoice",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="InvoiceItem.id"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "order_id": self.order_id,
            "subtotal": float(self.subtotal or 0),
            "delivery_fee": float(self.delivery_fee or 0),
            "discount_amount": float(self.discount_amount or 0),
            "tax_amount": float(self.tax_amount or 0),
            "total_amount": float(self.total_amount or 0),
            "status": self.status,
            "issued_at": self.issued_at.isoformat() if self.issued_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            # Absolute URL, computed at response time — the DB only
            # stores the relative path (portable across environments/
            # deployments); the frontend has no reliable way to know
            # the API origin otherwise, so build it here.
            "payment_screenshot_path": (
                request.host_url.rstrip("/") + self.payment_screenshot_path
                if self.payment_screenshot_path else None
            ),
            "payment_note": self.payment_note,
            "payment_submitted_at": (
                self.payment_submitted_at.isoformat()
                if self.payment_submitted_at else None
            ),
            "payment_verified_by": self.payment_verified_by,
            "payment_rejection_reason": self.payment_rejection_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.to_dict() for item in self.items],
        }