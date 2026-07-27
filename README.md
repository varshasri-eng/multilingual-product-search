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
### 2026-07-26

**Done**
- Dockerized the complete application (frontend, backend, PostgreSQL) —
  `docker compose up --build` verified working end-to-end.
- Product details page working: search, alias chips, breadcrumbs,
  quantity selector, Add to Cart (client-side), out-of-stock/low-stock
  states.
- Related products implemented two ways: structural (category/subtype/
  tags) and behavioral (visit history — "customers who viewed this also
  viewed"). Recently Viewed (per-visitor browsing history) also added.
- `image_url` rendering confirmed working correctly end-to-end (verified
  with a test image) — real photos display when a valid URL is present,
  with graceful fallback to a placeholder otherwise.
  **Resolved:** the reported typo-search issue ("gongur" returning no
    results) could not be reproduced after investigation — verified working
    correctly end-to-end (database → Flask → React) with multiple test
    searches. Likely cause of the original report was a stray character in
    the test input or a stale build, not an actual bug in the search logic.

**Pending**
- Sourced product images via Wikimedia Commons for 9 products, but photo
  quality/style was inconsistent and not presentable for the storefront
  (mismatched lighting, framing, amateur photos). Rolled back rather than
  ship inconsistent imagery. Needs either real product photography or a
  licensed stock-photo source — holding for direction.
- Deployment bundle/documentation for Linux testing not yet written.

**Planned**
- Complete image sourcing once a photo strategy is decided.
- Write deployment instructions and verify Docker on a real Linux host
  (currently only tested on Windows via Docker Desktop).
- Extend related-products logic toward true customer-preference
  personalization (current behavioral signal is anonymous-session-based,
  not tied to a logged-in customer profile — no auth system exists yet).
- End-to-end testing pass; fix remaining UI/API issues as found.

**Issues**

- Related-products personalization is anonymous/session-based only —
  true preference-based recommendations need a login system first.
- Linux deployment unverified.
### 2026-07-26

**Done**
- Dockerized the complete application (React frontend, Flask backend,
  PostgreSQL database) using Docker Compose. Verified the complete
  stack starts successfully with `docker compose up --build`.
- Implemented the Product Details API (`GET /api/products/<id>`)
  returning product information, aliases, category/subcategory,
  gallery images, and logging product views.
- Implemented the Search API (`GET /api/search`) exposing ranked
  multi-result search with fuzzy matching, aliases, regional names,
  hashtags, and typo correction.
- Implemented the Related Products API supporting both structural
  recommendations (category/subcategory/tags) and behavioural
  recommendations ("customers who viewed this also viewed").
- Added Recently Viewed functionality based on anonymous visitor
  browsing history.
- Added customer authentication:
  - User registration endpoint (`POST /api/auth/register`)
  - User login endpoint (`POST /api/auth/login`)
  - JWT-based authentication
  - Protected profile endpoint (`GET /api/auth/me`)
  - Authentication verified end-to-end using PowerShell requests.
- Added local product image support. Product images are now served
  from the frontend's `/public/images` directory using the
  `image_url` field stored in PostgreSQL.
- Verified image rendering end-to-end (database → Flask API → React
  frontend), including placeholder fallback behaviour.
- Investigated the reported typo-search issue ("gongur" returning
  no results). Unable to reproduce after testing multiple scenarios.
  Search functionality was verified working correctly end-to-end.

**Pending**
- Test breadcrumb behaviour after customer login and update the UI
  if login state should be reflected.
- Extend related-product recommendations from anonymous browsing
  history to true customer-preference recommendations using
  authenticated customer data.
- Perform complete end-to-end testing after all UI integration is
  finished.

**Planned**
- Prepare and include a Linux deployment guide for mentor testing.
- Verify Docker deployment on a native Linux environment in addition
  to Windows Docker Desktop.
- Improve recommendation quality by incorporating customer purchase
  history and preferences after authentication.
- Complete final UI polish and regression testing before submission.

**Issues**
- Current recommendation engine is still session-based; personalised
  recommendations require additional customer interaction history.
- Linux deployment documentation is complete, but execution has not
  yet been validated on a real Linux machine.