"""
Database bootstrap — runs once at app startup.
  * db.create_all()                      — create any missing tables
  * ensure product columns exist         — idempotent ALTERs
  * seed catalog                         — categories + products if empty
Safe to run repeatedly; no-op once populated.
"""

import re

from app import db
from app.models.product import Category, Product
from app.models.search_term import SearchTerm
from app.utils.seed import CATALOG, PRODUCTS, SEARCH_TERMS

PRODUCT_EXTRA_COLUMNS = {
    "emoji": "VARCHAR(20) DEFAULT '🛒'",
    "diet":  "VARCHAR(20) DEFAULT 'veg'",
}


def ensure_product_columns():
    inspector = db.inspect(db.engine)
    if "products" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("products")}
    for col, ddl in PRODUCT_EXTRA_COLUMNS.items():
        if col not in existing:
            db.session.execute(
                db.text(
                    f"ALTER TABLE products ADD COLUMN IF NOT EXISTS {col} {ddl}"
                )
            )
    db.session.commit()


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug


def seed_catalog():
    """Upsert categories + products from the merged catalog (idempotent)."""
    categories = {}
    for cat in CATALOG:
        obj = Category.query.filter_by(slug=cat["slug"]).first()
        if not obj:
            obj = Category(
                name=cat["category"],
                slug=cat["slug"],
                display_order=cat["display_order"],
            )
            db.session.add(obj)
            db.session.flush()
        categories[cat["category"]] = obj

    for name, category, emoji, price, unit, diet, description in PRODUCTS:
        cat = categories[category]
        product = Product.query.filter_by(
            name=name, category_id=cat.id
        ).first()
        if not product:
            product = Product(
                name=name,
                slug=slugify(name),
                category_id=cat.id,
                price=price,
                unit=unit,
                emoji=emoji,
                diet=diet,
                description=description,
                is_active=True,
                is_featured=True,
            )
            db.session.add(product)
            db.session.flush()

    db.session.commit()


def seed_search_terms(commit=True):
    """Upsert multilingual search terms, keyed by product name (idempotent)."""
    by_name = {p.name: p for p in Product.query.all()}
    added = 0
    for name, term, term_type, language in SEARCH_TERMS:
        product = by_name.get(name)
        if not product:
            continue
        existing = SearchTerm.query.filter_by(
            product_id=product.id, search_term=term
        ).first()
        if existing:
            continue
        db.session.add(SearchTerm(
            product_id=product.id,
            search_term=term,
            term_type=term_type,
            language=language,
        ))
        added += 1

    if commit:
        db.session.commit()
        if added:
            print(f"[seed] added {added} search terms")


def init_db():
    db.create_all()
    ensure_product_columns()
    seed_catalog()
    seed_search_terms()
