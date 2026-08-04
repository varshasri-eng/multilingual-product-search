from datetime import datetime, timezone
from app import db


class ProductView(db.Model):
    """Anonymous per-visitor product page visit (for related/recently viewed)."""
    __tablename__ = "product_views"

    view_id     = db.Column(db.Integer, primary_key=True)
    session_id  = db.Column(db.String(100), nullable=False, index=True)
    product_id  = db.Column(db.Integer, db.ForeignKey("products.id"),
                            nullable=False, index=True)
    viewed_at   = db.Column(db.DateTime(timezone=True),
                            default=lambda: datetime.now(timezone.utc))

    product = db.relationship("Product")
