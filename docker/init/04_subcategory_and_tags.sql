-- ============================================================
-- Migration: subcategories (formal table) + multi-valued tags
-- Run AFTER database/add_product_code.sql
-- ============================================================
-- Why two new tables instead of just extending product_code:
--   - category_id / subcategory_id : ONE path per product (a product
--     is in exactly one category and one subcategory — this is what
--     the product_code prefix already represents structurally).
--   - tags / product_tags          : MANY per product. This is the
--     part a linear code cannot hold. Example from the mentor:
--     Toor Dal is simultaneously a dal, a lentil, a grocery item,
--     a pulse, a sambar ingredient, and a restaurant item — six
--     memberships on one product. A code can only ever point to one
--     place; a many-to-many tag table can point to many.
-- ============================================================

-- 1. SUBCATEGORIES — formalizes what was previously just the middle
--    segment of product_code (e.g. 'VEG', 'PWD') into a real table.
CREATE TABLE IF NOT EXISTS subcategories (
    subcategory_id    SERIAL PRIMARY KEY,
    category_id       INT NOT NULL REFERENCES categories(category_id),
    subcategory_name  VARCHAR(150) NOT NULL,
    subcategory_code  VARCHAR(10) NOT NULL,   -- e.g. 'PUL', 'VEG', 'RIT'
    UNIQUE (category_id, subcategory_code)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id INT REFERENCES subcategories(subcategory_id);

-- 2. TAGS — flat, reusable list. Not hierarchical, not tied to one
--    category — "sambar ingredient" could apply to a spice or a dal.
CREATE TABLE IF NOT EXISTS tags (
    tag_id     SERIAL PRIMARY KEY,
    tag_name   VARCHAR(100) NOT NULL UNIQUE
);

-- 3. PRODUCT_TAGS — the many-to-many join. This is what lets one
--    product carry unlimited tags.
CREATE TABLE IF NOT EXISTS product_tags (
    product_id  INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    tag_id      INT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- ============================================================
-- Backfill subcategories for existing 29 products, derived from
-- the middle segment of their existing product_code.
-- ============================================================
INSERT INTO subcategories (category_id, subcategory_name, subcategory_code)
SELECT c.category_id, v.name, v.code
FROM categories c
JOIN (VALUES
    ('Leaves',        'Ritual & Religious Leaves',        'RIT'),
    ('Leaves',        'Cosmetic & Hair Care Leaves',       'COS'),
    ('Spices',        'Spice Powders',                     'PWD'),
    ('Pickle Items',  'Vegetable Pickles',                 'VEG'),
    ('Grocery',       'Grains & Millets',                  'GRN'),
    ('Grocery',       'Nuts & Seeds',                      'NUT'),
    ('Karam Powders', 'Karam Podi (Spice Mixes)',          'PWD')
) AS v(category_name, name, code) ON c.category_name = v.category_name
ON CONFLICT (category_id, subcategory_code) DO NOTHING;

-- Link each existing product to its subcategory via the code it
-- already has (product_code's middle segment matches subcategory_code).
UPDATE products p
SET subcategory_id = s.subcategory_id
FROM subcategories s
JOIN categories c ON c.category_id = s.category_id
WHERE p.category_id = c.category_id
  AND p.product_code IS NOT NULL
  AND split_part(p.product_code, '-', 2) = s.subcategory_code
  AND p.subcategory_id IS NULL;

-- ============================================================
-- Worked example: Toor Dal, exactly as the mentor described it —
-- one product, six overlapping classifications.
-- ============================================================

INSERT INTO subcategories (category_id, subcategory_name, subcategory_code)
SELECT category_id, 'Pulses & Lentils', 'PUL'
FROM categories WHERE category_name = 'Grocery'
ON CONFLICT (category_id, subcategory_code) DO NOTHING;

INSERT INTO products (category_id, subcategory_id, product_name, description, price, stock_quantity, product_code)
SELECT c.category_id, s.subcategory_id, 'Toor Dal', 'Split, unpolished toor dal (pigeon pea lentils) — a staple for sambar and everyday dal.', 4.49, 100, 'GRO-PUL-TOR-001'
FROM categories c
JOIN subcategories s ON s.category_id = c.category_id AND s.subcategory_code = 'PUL'
WHERE c.category_name = 'Grocery'
  AND NOT EXISTS (SELECT 1 FROM products WHERE product_name = 'Toor Dal');

-- Six tags on one product — this is the part the code alone can't express.
INSERT INTO tags (tag_name) VALUES
    ('dal'), ('lentil'), ('pulses'), ('grocery'),
    ('sambar ingredient'), ('restaurant item')
ON CONFLICT (tag_name) DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.product_id, t.tag_id
FROM products p, tags t
WHERE p.product_name = 'Toor Dal'
  AND t.tag_name IN ('dal', 'lentil', 'pulses', 'grocery', 'sambar ingredient', 'restaurant item')
ON CONFLICT DO NOTHING;

-- Kandi Karam Podi is genuinely toor-dal-based (it's a roasted dal
-- powder) — tagging it here too means the shared_tag relatedness
-- query below has a real cross-category match to show, not an
-- empty result.
INSERT INTO product_tags (product_id, tag_id)
SELECT p.product_id, t.tag_id
FROM products p, tags t
WHERE p.product_name = 'Kandi Karam Podi'
  AND t.tag_name IN ('dal', 'sambar ingredient')
ON CONFLICT DO NOTHING;

-- Also give it the same search_terms treatment as everything else,
-- so it's findable the same way as the other 29 products.
INSERT INTO search_terms (product_id, search_term, term_type, language)
SELECT p.product_id, v.term, v.term_type, v.language
FROM products p, (VALUES
    ('toor dal',   'official', NULL),
    ('tur dal',    'alias',    NULL),
    ('arhar dal',  'regional', 'Hindi'),
    ('kandi pappu','regional', 'Telugu'),
    ('thuvaram paruppu', 'regional', 'Tamil'),
    ('tuvar dal',  'typo',     NULL),
    ('#toordal',   'hashtag',  NULL)
) AS v(term, term_type, language)
WHERE p.product_name = 'Toor Dal'
ON CONFLICT (product_id, search_term) DO NOTHING;

-- ============================================================
-- Verify: this is the query that shows why the multi-tag table
-- matters — Toor Dal's full classification, all at once.
-- ============================================================
SELECT
    p.product_name,
    p.product_code,
    c.category_name,
    s.subcategory_name,
    string_agg(t.tag_name, ', ' ORDER BY t.tag_name) AS tags
FROM products p
JOIN categories c ON c.category_id = p.category_id
LEFT JOIN subcategories s ON s.subcategory_id = p.subcategory_id
LEFT JOIN product_tags pt ON pt.product_id = p.product_id
LEFT JOIN tags t ON t.tag_id = pt.tag_id
WHERE p.product_name = 'Toor Dal'
GROUP BY p.product_name, p.product_code, c.category_name, s.subcategory_name;
