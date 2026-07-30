"""
Order model — stub for Sprint 2.
Imported safely in admin routes to avoid import errors.
"""
# This will be fully implemented in the orders sprint.
# Defined here as a minimal stub so admin routes can import it
# without crashing.

from datetime import datetime, timezone
from app import db


class Order(db.Model):
    __tablename__ = "orders"

    id           = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True)
    customer_id  = db.Column(db.Integer, db.ForeignKey("customers.id"))
    status       = db.Column(db.String(30), default="pending")
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    created_at   = db.Column(db.DateTime(timezone=True),
                             default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "order_number": self.order_number,
            "customer_id": self.customer_id,
            "status": self.status,
            "total_amount": float(self.total_amount or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
