from datetime import datetime, timezone
from app import db


class ProductDeliveryRule(db.Model):
    __tablename__ = "product_delivery_rules"

    product_id = db.Column(
        db.Integer, db.ForeignKey("products.id", ondelete="CASCADE"),
        primary_key=True
    )
    restock_cycle = db.Column(db.String(20), default="none")  # weekly | monthly | none
    restock_day_of_week = db.Column(db.Integer)  # 0=Sunday..6=Saturday
    restock_day_of_month = db.Column(db.Integer)  # 1-31
    min_lead_days = db.Column(db.Integer, default=3)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    product = db.relationship("Product", backref=db.backref("delivery_rule", uselist=False))

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "restock_cycle": self.restock_cycle,
            "restock_day_of_week": self.restock_day_of_week,
            "restock_day_of_month": self.restock_day_of_month,
            "min_lead_days": self.min_lead_days,
        }
