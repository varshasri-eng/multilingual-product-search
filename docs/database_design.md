# Database Design

## Overview

The database supports multilingual, typo-tolerant product search using PostgreSQL's built-in `pg_trgm` extension — no external search engine required for the current phase. Six tables cover the full loop: product data, every searchable name for that product, what customers actually searched for, and how products relate to each other for fallback suggestions.

## Entity-Relationship Overview

```
categories
    │
    ▼
products ──────┬──────────────┬──────────────┐
    │           │              │              │
    ▼           ▼              ▼              ▼
product_images  search_terms   search_logs    related_products
                                (references     (self-referencing:
                                 products)       product_id ↔
                                                 related_product_id)
```

## Tables

### `categories`
Top-level grouping (e.g., "Leaves", "Spices"). `category_name` is unique — this is what the Excel import script matches against when creating a product.

### `products`
The core catalog record: name, scientific name, description, price, stock, image URL. Deliberately does **not** hold aliases or search terms directly — that's the whole point of splitting `search_terms` out.

### `product_images`
Separate table rather than a single `image_url` column, because a product needs multiple angles/photos once image-based search is built — one product, many images.

### `search_terms` — the core design decision
Every name a product can be found by is one row here, not a comma-packed field and not separate alias/typo tables:

| Column | Purpose |
|---|---|
| `search_term` | The actual text to match against (e.g., "gorintaku") |
| `term_type` | `official`, `alias`, `regional`, `typo`, or `hashtag` — used for ranking |
| `language` | Optional — e.g., "Telugu", "Hindi", for reference/reporting |

**Why one table instead of separate alias/typo tables:** every searchable word lives in the same place, so a single query against `search_terms` finds a product regardless of *why* the term is valid. `term_type` is what lets the ranking logic prefer an official name over a typo when both happen to match.

**Fuzzy matching:** `search_terms` has a GIN trigram index (`pg_trgm`) on `search_term`, enabling the `%` similarity operator — e.g. `search_term % 'gorintuku'` matches `'gorintaku'` even though the exact string was never stored. This is native to Postgres; no Typesense/Meilisearch dependency for this phase.

### `search_logs`
Every search — successful or not — gets one row: the query text, which product (if any) it resolved to, and whether a result was found. `result_found = false` rows are the direct signal for "this alias is missing," which is the ongoing data-collection loop the project proposal describes (Section 4.1).

### `related_products`
Self-referencing table (`product_id` → `related_product_id`) used for the "never show a blank page" fallback — when a search resolves to nothing, this table (once populated) is where fallback suggestions come from.

## Ranking Logic

Implemented in `search_products()` (see `database/search_function.sql`). When multiple `search_terms` rows match a query, results are ordered by:

1. `term_type` priority: `official` > `alias` > `regional` > `hashtag` > `typo`
2. Trigram similarity score (closer matches first) within the same `term_type`

This means an exact official name always outranks a fuzzy typo guess, even if the typo scores a higher raw similarity — which matters once the catalog has enough products that ambiguous matches become common.

## Data Entry Workflow

`dataset/products.xlsx` is the source of truth (two sheets: `products`, `search_terms`, matching the tables above 1:1). `dataset/import_dataset.py` reads it and generates `database/generated_seed.sql`, validating `term_type` values and product references before writing anything — invalid data is rejected with the exact row number rather than silently imported.

## Current Data (Phase 1)

- 2 products: Mehandi Leaves (Fresh), Turmeric Powder
- 31 search terms across official names, regional names (Telugu, Hindi, Tamil, Kannada), aliases, common typos, and hashtags
