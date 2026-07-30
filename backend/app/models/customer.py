from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False, unique=True)
    whatsapp_number = db.Column(db.String(20))
    email = db.Column(db.String(255), unique=True)
    password_hash = db.Column(db.String(255))

    # preferences
    preferred_language = db.Column(db.String(20), default="english")
    # telugu | hindi | tamil | english
    dietary_preference = db.Column(db.String(20), default="veg")
    # veg | nonveg | both
    default_order_type = db.Column(db.String(20), default="delivery")
    # delivery | pickup

    # household link (for family sharing)
    household_id = db.Column(db.Integer, db.ForeignKey("households.id"), nullable=True)

    # access control
    role       = db.Column(db.String(20), default="customer")  # customer | admin
    # admin_role: NULL=not staff | pending=awaiting approval
    #             read | write | full
    admin_role        = db.Column(db.String(20), default=None)
    admin_request_note = db.Column(db.Text, default=None)
    is_verified       = db.Column(db.Boolean, default=False)
    is_active         = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # relationships
    addresses = db.relationship("CustomerAddress", backref="customer", lazy=True,
                                cascade="all, delete-orphan")
    sessions = db.relationship("Session", backref="customer", lazy=True,
                               cascade="all, delete-orphan")

    # ── password helpers ─────────────────────────────────────
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    # ── serialization ────────────────────────────────────────
    def to_dict(self, include_addresses=False):
        data = {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "whatsapp_number": self.whatsapp_number,
            "email": self.email,
            "preferred_language": self.preferred_language,
            "dietary_preference": self.dietary_preference,
            "default_order_type": self.default_order_type,
            "household_id": self.household_id,
            "role": self.role,
            "admin_role": self.admin_role,
            "admin_request_note": self.admin_request_note,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_addresses:
            data["addresses"] = [a.to_dict() for a in self.addresses]
        return data

    def to_public_dict(self):
        """Safe subset — never expose password_hash"""
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "whatsapp_number": self.whatsapp_number,
            "email": self.email,
            "preferred_language": self.preferred_language,
            "dietary_preference": self.dietary_preference,
            "default_order_type": self.default_order_type,
            "role": self.role,
            "admin_role": self.admin_role,
            "is_verified": self.is_verified,
        }
