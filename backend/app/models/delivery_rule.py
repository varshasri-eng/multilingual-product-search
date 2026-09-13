"""
ProductDeliveryRule — per-product restock/availability rule.

RECONSTRUCTED, not copied blindly: this file wasn't directly available,
but its shape is pinned down by two independent sources that agree:
  1. app/routes/products.py already does
     `ProductDeliveryRule.query.get(product_id)` — i.e. product_id
     IS the primary key (one rule per product, no separate id column) —
     and reads exactly `.restock_cycle`, `.restock_day_of_week`,
     `.restock_day_of_month`, `.min_lead_days` off the result.
  2. The delivery-scheduling spec's §3 column list matches those same
     names exactly.

If the real file already exists in the branch and differs from this,
that file wins — this is a best-effort reconstruction to unblock the
admin rule-management endpoints, not an assumption that it's novel.
"""

from datetime import datetime, timezone
from app import db

VALID_RESTOCK_CYCLES = {"weekly", "monthly", "none"}


class ProductDeliveryRule(db.Model):
    __tablename__ = "product_delivery_rules"

    # One rule per product — product_id IS the primary key (matches
    # the existing `ProductDeliveryRule.query.get(product_id)` lookup
    # in products.py, which only works if the PK is product_id itself).
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        primary_key=True,
    )

    # weekly | monthly | none — see utils/delivery.py for how each is
    # interpreted.
    restock_cycle = db.Column(
        db.String(20),
        nullable=False,
        default="none",
    )

    # 0=Sunday .. 6=Saturday (schema convention per the spec) — only
    # meaningful when restock_cycle == 'weekly'.
    restock_day_of_week = db.Column(db.Integer, nullable=True)

    # 1-31 — only meaningful when restock_cycle == 'monthly'.
    restock_day_of_month = db.Column(db.Integer, nullable=True)

    # Minimum days of lead time required before the product can be
    # delivered/picked up, applied on top of either "today" (in stock)
    # or the next restock date (out of stock).
    min_lead_days = db.Column(db.Integer, nullable=False, default=0)

    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "restock_cycle": self.restock_cycle,
            "restock_day_of_week": self.restock_day_of_week,
            "restock_day_of_month": self.restock_day_of_month,
            "min_lead_days": self.min_lead_days,
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at else None
            ),
        }