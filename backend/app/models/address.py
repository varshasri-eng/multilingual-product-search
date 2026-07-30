from datetime import datetime, timezone
from app import db


class Address(db.Model):
    """
    Standalone address record.
    Linked to customers via CustomerAddress (many-to-many junction).
    The DB also has a legacy customer_id column kept for compatibility.
    """
    __tablename__ = "addresses"

    id               = db.Column(db.Integer, primary_key=True)
    customer_id      = db.Column(db.Integer, db.ForeignKey("customers.id"))  # legacy
    delivery_zone_id = db.Column(db.Integer, db.ForeignKey("delivery_zones.id"))
    label            = db.Column(db.String(50), default="Home")
    address_line1    = db.Column(db.Text, nullable=False)
    address_line2    = db.Column(db.Text)
    city             = db.Column(db.String(100), nullable=False)
    state            = db.Column(db.String(50), default="CA")
    zip_code         = db.Column(db.String(10), nullable=False)
    delivery_notes   = db.Column(db.Text)
    is_default       = db.Column(db.Boolean, default=False)
    created_at       = db.Column(db.DateTime(timezone=True),
                                 default=lambda: datetime.now(timezone.utc))
    updated_at       = db.Column(db.DateTime(timezone=True),
                                 default=lambda: datetime.now(timezone.utc),
                                 onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "address_line1": self.address_line1,
            "address_line2": self.address_line2,
            "city": self.city,
            "state": self.state,
            "zip_code": self.zip_code,
            "delivery_notes": self.delivery_notes,
            "is_default": self.is_default,
            "label": self.label,
            "delivery_zone_id": self.delivery_zone_id,
        }


class CustomerAddress(db.Model):
    """
    Junction table — many customers ↔ many addresses.
    Two customers in the same household can share an address_id.
    """
    __tablename__ = "customer_address_links"

    id          = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    address_id  = db.Column(db.Integer, db.ForeignKey("addresses.id"), nullable=False)
    label       = db.Column(db.String(50), default="Home")
    is_default  = db.Column(db.Boolean, default=False)
    created_at  = db.Column(db.DateTime(timezone=True),
                            default=lambda: datetime.now(timezone.utc))

    address = db.relationship("Address", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "is_default": self.is_default,
            "address": self.address.to_dict() if self.address else None,
        }
