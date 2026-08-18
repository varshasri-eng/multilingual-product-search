from datetime import datetime, timezone
from app import db


class Order(db.Model):
    __tablename__ = "orders"

    id               = db.Column(db.Integer, primary_key=True)
    order_number     = db.Column(db.String(20), unique=True)
    customer_id      = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    address_id       = db.Column(db.Integer, db.ForeignKey("addresses.id"))
    delivery_zone_id = db.Column(db.Integer, db.ForeignKey("delivery_zones.id"))

    # totals
    subtotal        = db.Column(db.Numeric(10, 2), default=0)
    delivery_fee    = db.Column(db.Numeric(10, 2), default=0)
    discount_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount    = db.Column(db.Numeric(10, 2), default=0)

    # fulfillment
    order_type           = db.Column(db.String(20), default="delivery")  # delivery | pickup
    status               = db.Column(db.String(30), default="pending")
    # pending | confirmed | processing | out_for_delivery | delivered | cancelled
    requested_date       = db.Column(db.Date)
    requested_time_slot  = db.Column(db.String(50))
    delivered_at         = db.Column(db.DateTime(timezone=True))
    notes                = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    items = db.relationship("OrderItem", backref="order", lazy=True,
                            cascade="all, delete-orphan",
                            order_by="OrderItem.id")

    def to_dict(self, include_items=True):
        data = {
            "id": self.id,
            "order_number": self.order_number,
            "customer_id": self.customer_id,
            "address_id": self.address_id,
            "subtotal": float(self.subtotal or 0),
            "delivery_fee": float(self.delivery_fee or 0),
            "discount_amount": float(self.discount_amount or 0),
            "total_amount": float(self.total_amount or 0),
            "order_type": self.order_type,
            "status": self.status,
            "requested_date": self.requested_date.isoformat() if self.requested_date else None,
            "requested_time_slot": self.requested_time_slot,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            data["items"] = [i.to_dict() for i in self.items]

        if self.invoice:
            data["invoice"] = self.invoice.to_dict()
        else:
            data["invoice"] = None

        return data


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id           = db.Column(db.Integer, primary_key=True)
    order_id     = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id   = db.Column(db.Integer, db.ForeignKey("products.id"))
    product_name = db.Column(db.String(255), nullable=False)  # snapshot at order time
    unit         = db.Column(db.String(50))
    quantity     = db.Column(db.Integer, nullable=False, default=1)
    unit_price   = db.Column(db.Numeric(10, 2), nullable=False)
    line_total   = db.Column(db.Numeric(10, 2), nullable=False)
    created_at   = db.Column(db.DateTime(timezone=True),
                             default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "unit": self.unit,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "line_total": float(self.line_total),
        }
