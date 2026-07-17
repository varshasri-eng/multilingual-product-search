# multilingual-product-search
An intelligent e-commerce search system supporting regional product aliases, fuzzy matching, typo correction, and visual product search.
## Development Log

### 2026-07-17
- Implemented full 6-table PostgreSQL schema (`categories`, `products`,
  `product_images`, `search_terms`, `search_logs`, `related_products`)
  in `database/schema.sql`, including a `pg_trgm` index for native
  typo-tolerant search.
- Built an Excel-based data entry pipeline: `dataset/products.xlsx` is
  the editable source of truth; `dataset/import_dataset.py` converts it
  into `database/generated_seed.sql`, validated against the schema
  (rejects invalid `term_type` values and orphaned product references
  before writing any SQL).
- Loaded Phase 1 data: 2 products (Mehandi Leaves / Gorintaku, Turmeric
  Powder / Haldi), 31 search terms across official names, regional
  names, aliases, common typos, and hashtags.
- Implemented `search_products()` — a ranked search function
  (`database/search_function.sql`) combining fuzzy matching, term-type
  priority (official > alias > regional > hashtag > typo), and
  automatic logging of every search to `search_logs`, including
  zero-result searches — the data source for identifying missing
  aliases going forward.
- Verified end-to-end: fuzzy search on a genuine misspelling
  ("gorintuku") correctly resolves to the right product via `pg_trgm`,
  with no external search engine involved.

**Next up:** rank-testing across both products, wiring `related_products`
for the zero-result fallback, and reviewing `search_logs` for gaps.