from datetime import datetime, timezone
from app import db


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id         = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    token      = db.Column(db.String(255), nullable=False, unique=True)
    is_used    = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc))

    customer = db.relationship("Customer", backref=db.backref("reset_tokens", lazy=True))

    def is_valid(self):
        return not self.is_used and self.expires_at > datetime.now(timezone.utc)
