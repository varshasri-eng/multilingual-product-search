from datetime import datetime, timezone
from app import db


class SearchLog(db.Model):
    """Every customer search — the signal for missing aliases/typos."""
    __tablename__ = "search_logs"

    log_id             = db.Column(db.Integer, primary_key=True)
    search_query       = db.Column(db.String(200), nullable=False)
    matched_product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    result_found       = db.Column(db.Boolean, default=False)
    searched_at        = db.Column(db.DateTime(timezone=True),
                                   default=lambda: datetime.now(timezone.utc))

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "log_id": self.log_id,
            "search_query": self.search_query,
            "matched_product_id": self.matched_product_id,
            "matched_product_name": self.product.name if self.product else None,
            "result_found": self.result_found,
            "searched_at": self.searched_at.isoformat() if self.searched_at else None,
        }
