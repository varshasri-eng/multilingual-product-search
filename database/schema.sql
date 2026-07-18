-- ============================================================
-- Multilingual Product Search — Database Schema
-- Database: indian_product_search
-- ============================================================
-- Order matters: each table only references ones created before it.
-- categories and products already exist in your pgAdmin instance —
-- IF NOT EXISTS guards let you re-run this whole file safely.
-- ============================================================

-- 1. CATEGORIES ------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id     SERIAL PRIMARY KEY,
    category_name   VARCHAR(150) NOT NULL UNIQUE,
    description     TEXT
);

-- 2. PRODUCTS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    product_id       SERIAL PRIMARY KEY,
    category_id      INT REFERENCES categories(category_id),
    product_name     VARCHAR(200) NOT NULL,
    scientific_name  VARCHAR(200),
    description      TEXT,
    price            DECIMAL(10,2),
    stock_quantity   INT DEFAULT 0,
    image_url        TEXT,
    -- Hierarchical SKU: CATEGORY-SUBTYPE-SEQUENCE (e.g. 'PIK-VEG-004').
    -- Products sharing the first two segments are closely related;
    -- sharing just the category segment are loosely related. See
    -- database/populate_related_products.sql for how this drives
    -- automatic related_products population.
    product_code     VARCHAR(30) UNIQUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT IMAGES ------------------------------------------------
-- Separate table (not just products.image_url) because a product
-- needs multiple angles/photos for image-search embeddings later.
CREATE TABLE IF NOT EXISTS product_images (
    image_id     SERIAL PRIMARY KEY,
    product_id   INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    image_url    TEXT NOT NULL,
    is_primary   BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SEARCH TERMS ------------------------------------------------
-- The core of the whole project. Every name a product can be found
-- by — official name, regional name, alias, common typo, hashtag —
-- lives here as one row, ranked by term_type. This is what replaces
-- separate "aliases" and "typos" tables.
CREATE TABLE IF NOT EXISTS search_terms (
    search_term_id  SERIAL PRIMARY KEY,
    product_id      INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    search_term     VARCHAR(200) NOT NULL,
    term_type       VARCHAR(20) NOT NULL CHECK (
                        term_type IN ('official', 'alias', 'regional', 'typo', 'hashtag')
                    ),
    language        VARCHAR(50),        -- e.g. 'Telugu', 'Hindi', 'Tamil' (optional)
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, search_term)
);

-- Fast lookup index — every search hits this column.
CREATE INDEX IF NOT EXISTS idx_search_terms_term ON search_terms (search_term);

-- Optional but recommended: pg_trgm gives Postgres native fuzzy/typo
-- matching (trigram similarity) so you don't need Typesense/Meilisearch
-- for the early proof-of-concept phase — good to demo to your mentor
-- before introducing an external search engine.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_search_terms_trgm
    ON search_terms USING GIN (search_term gin_trgm_ops);

-- 5. SEARCH LOGS ------------------------------------------------
-- Every search a customer runs gets logged here. This is the data
-- source for "which aliases are missing" (Section 4.1 of the proposal)
-- — result_found = false rows are exactly what needs a new search_term.
CREATE TABLE IF NOT EXISTS search_logs (
    log_id              SERIAL PRIMARY KEY,
    search_query        VARCHAR(200) NOT NULL,
    matched_product_id  INT REFERENCES products(product_id),
    result_found        BOOLEAN DEFAULT FALSE,
    searched_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. RELATED PRODUCTS ------------------------------------------------
-- Powers the "never show a blank page" fallback — when a search
-- doesn't resolve, show related products instead.
CREATE TABLE IF NOT EXISTS related_products (
    related_id          SERIAL PRIMARY KEY,
    product_id          INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    related_product_id  INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    relation_type       VARCHAR(50) DEFAULT 'same_category',
    CONSTRAINT no_self_relation CHECK (product_id <> related_product_id),
    UNIQUE (product_id, related_product_id)
);
