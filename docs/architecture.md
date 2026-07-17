# Architecture

## Current State (Phase 1 — proof of concept)

The project currently proves the core search concept entirely inside PostgreSQL, deliberately without a full application layer or external search engine yet. This keeps the first milestone focused on one question: *does fuzzy, multilingual, alias-based search actually work?*

```
dataset/products.xlsx  (source of truth — human-edited)
        │
        │  python dataset/import_dataset.py
        ▼
database/generated_seed.sql
        │
        │  run in pgAdmin
        ▼
PostgreSQL (indian_product_search)
        │
        │  SELECT * FROM search_products('gorintuku');
        ▼
Ranked, logged search results
```

### Why start here instead of with Medusa/Next.js

Standing up a full headless commerce backend before the search logic is proven would mean debugging two unknowns at once (the platform *and* the search approach). Proving the search concept directly in Postgres first — with real data, real typos, real ambiguous queries — means the harder, more novel part of the project (Section 4 of the main proposal: the multilingual alias dataset) gets validated early, independent of whatever framework sits on top of it later.

### Components (current)

| Component | Role |
|---|---|
| PostgreSQL 18 | Stores products, categories, and every searchable alias |
| `pg_trgm` extension | Native typo-tolerant fuzzy matching — no external search engine needed yet |
| `search_products()` (PL/pgSQL function) | Single entry point: matches, ranks by term_type, and logs every search |
| `dataset/products.xlsx` | Editable source of truth for product + alias data |
| `dataset/import_dataset.py` | Validates and converts the spreadsheet into runnable SQL |

## Planned Future Architecture

Once the search concept and dataset are proven, the plan (per the main proposal) is to wrap this database in a real storefront:

```
[Customer Search Box / Photo Upload]
            │
            ▼
   Next.js Storefront  ──────►  Medusa (headless commerce backend)
            │                          │
            ▼                          ▼
   Meilisearch / Typesense      PostgreSQL (this database,
   (search-as-a-service,         extended with Medusa's own
    replaces search_products()   product/order tables)
    for production-scale
    fuzzy + hashtag search)
            │
            ▼
   CLIP image embeddings + vector search
   (visual product search)
```

### Migration path from current state

- `search_terms` data migrates directly into Meilisearch/Typesense as searchable fields on each product document — the `term_type` ranking logic translates into that engine's ranking rules.
- `search_logs` continues to matter post-migration: it's still the source for "which alias is missing," regardless of which engine is doing the matching.
- `related_products` gets populated and wired into the storefront's zero-result fallback UI.
- Image search is additive — CLIP embeddings and vector search get introduced once text-based search is stable, not before.

## Design Principles Carried Through Both Phases

1. **Aliases are never optional metadata** — every product is matched on its full alias/hashtag set, never just its title, in both the current Postgres-only version and the future search-engine version.
2. **Never a blank result page** — the fallback chain (exact → fuzzy → hashtag → category/related-product suggestion) is the same concept whether it's implemented in a SQL function today or a storefront component later.
3. **The dataset is the product** — the Excel-sourced alias dataset is designed to be portable to whatever search engine sits on top of it; it's not tied to PostgreSQL specifically.
