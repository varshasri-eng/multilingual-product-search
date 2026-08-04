"""
Product catalog seed — Store2Home.
Seeds categories, products and multilingual search terms if empty.
Safe to re-run: guarded by existence checks.
"""

from app.utils.catalog_data import CATALOG, PRODUCTS, SEARCH_TERMS

__all__ = ["CATALOG", "PRODUCTS", "SEARCH_TERMS"]
