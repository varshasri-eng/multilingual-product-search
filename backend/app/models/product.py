from datetime import datetime, timezone
from app import db


class Category(db.Model):
    __tablename__ = "categories"

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False, unique=True)
    slug          = db.Column(db.String(100), nullable=False, unique=True)
    description   = db.Column(db.Text)
    image_url     = db.Column(db.Text)
    display_order = db.Column(db.Integer, default=0)
    is_active     = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime(timezone=True),
                              default=lambda: datetime.now(timezone.utc))
    updated_at    = db.Column(db.DateTime(timezone=True),
                              default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))

    products = db.relationship("Product", backref="category", lazy=True,
                               order_by="Product.name")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "image_url": self.image_url,
            "display_order": self.display_order,
        }


class Product(db.Model):
    __tablename__ = "products"

    id               = db.Column(db.Integer, primary_key=True)
    category_id      = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)

    name             = db.Column(db.String(255), nullable=False)
    slug             = db.Column(db.String(255), nullable=False, unique=True)
    name_telugu      = db.Column(db.String(255))
    name_hindi       = db.Column(db.String(255))
    name_tamil       = db.Column(db.String(255))

    price            = db.Column(db.Numeric(10, 2), nullable=False)
    discounted_price = db.Column(db.Numeric(10, 2))
    unit             = db.Column(db.String(50))

    description      = db.Column(db.Text)
    image_url        = db.Column(db.Text)
    thumbnail_url    = db.Column(db.Text)
    is_active        = db.Column(db.Boolean, default=True)
    is_featured      = db.Column(db.Boolean, default=False)
    tags             = db.Column(db.Text)

    # store2home extras (added idempotently by bootstrap)
    emoji            = db.Column(db.String(20), default="🛒")
    diet             = db.Column(db.String(20), default="veg")  # veg | nonveg

    created_at       = db.Column(db.DateTime(timezone=True),
                                 default=lambda: datetime.now(timezone.utc))
    updated_at       = db.Column(db.DateTime(timezone=True),
                                 default=lambda: datetime.now(timezone.utc),
                                 onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        price = self.discounted_price if self.discounted_price else self.price
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "category": self.category.name if self.category else None,
            "category_id": self.category_id,
            "price": float(price),
            "unit": self.unit,
            "description": self.description,
            "image_url": self.image_url,
            "emoji": self.emoji,
            "diet": self.diet,
            "is_active": self.is_active,
            "is_featured": self.is_featured,
        }
