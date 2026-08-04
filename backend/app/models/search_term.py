from datetime import datetime, timezone
from app import db


class SearchTerm(db.Model):
    __tablename__ = "search_terms"

    search_term_id = db.Column(db.Integer, primary_key=True)
    product_id     = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    search_term    = db.Column(db.String(200), nullable=False)
    term_type      = db.Column(db.String(20), nullable=False)  # official | alias | regional | typo | hashtag
    language       = db.Column(db.String(50))
    created_at     = db.Column(db.DateTime(timezone=True),
                               default=lambda: datetime.now(timezone.utc))

    product = db.relationship("Product", backref=db.backref("search_terms", lazy=True,
                                                             cascade="all, delete-orphan"))

    __table_args__ = (db.UniqueConstraint("product_id", "search_term", name="uq_search_term_product"),)

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "search_term": self.search_term,
            "term_type": self.term_type,
            "language": self.language,
        }
