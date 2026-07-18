-- ============================================================
-- Day 3 validation: CRUD test pass
-- ============================================================
-- Everything here uses a clearly-fake test product ('ZZZ-TEST
-- Product') so it can never collide with real catalog data, and
-- the script deletes it at the end — safe to run repeatedly.
--
-- Run each numbered section and check the result against the
-- comment above it before moving to the next.
-- ============================================================

-- ---------- 1. CREATE ----------
-- Insert a test product with an image, a tag, and a search term
-- in one pass — this is the part of CRUD we've actually exercised
-- the least (product_images has never had a row in it before this).
INSERT INTO categories (category_name, description)
VALUES ('ZZZ-TEST Category', 'CRUD test only — safe to ignore')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO products (category_id, product_name, description, price, stock_quantity, product_code)
SELECT category_id, 'ZZZ-TEST Product', 'CRUD test product', 1.00, 1, 'ZZZ-TST-001'
FROM categories WHERE category_name = 'ZZZ-TEST Category'
AND NOT EXISTS (SELECT 1 FROM products WHERE product_name = 'ZZZ-TEST Product');

INSERT INTO product_images (product_id, image_url, is_primary)
SELECT product_id, 'https://example.com/test.jpg', TRUE
FROM products WHERE product_name = 'ZZZ-TEST Product';

INSERT INTO search_terms (product_id, search_term, term_type)
SELECT product_id, 'zzz test term', 'official'
FROM products WHERE product_name = 'ZZZ-TEST Product'
ON CONFLICT (product_id, search_term) DO NOTHING;

INSERT INTO tags (tag_name) VALUES ('zzz-test-tag') ON CONFLICT (tag_name) DO NOTHING;
INSERT INTO product_tags (product_id, tag_id)
SELECT p.product_id, t.tag_id
FROM products p, tags t
WHERE p.product_name = 'ZZZ-TEST Product' AND t.tag_name = 'zzz-test-tag'
ON CONFLICT DO NOTHING;

-- Expect: 1 row, showing the product with its image, tag, and search term.
SELECT p.product_name, pi.image_url, t.tag_name, st.search_term
FROM products p
JOIN product_images pi ON pi.product_id = p.product_id
JOIN product_tags pt ON pt.product_id = p.product_id
JOIN tags t ON t.tag_id = pt.tag_id
JOIN search_terms st ON st.product_id = p.product_id
WHERE p.product_name = 'ZZZ-TEST Product';


-- ---------- 2. READ ----------
-- Already exercised heavily (every SELECT so far) — one more here
-- for completeness, confirming the category relationship reads back.
-- Expect: 1 row, category_name = 'ZZZ-TEST Category'.
SELECT p.product_name, c.category_name
FROM products p JOIN categories c ON c.category_id = p.category_id
WHERE p.product_name = 'ZZZ-TEST Product';


-- ---------- 3. UPDATE ----------
-- Change price and stock, confirm the change persists.
UPDATE products
SET price = 99.99, stock_quantity = 500
WHERE product_name = 'ZZZ-TEST Product';

-- Expect: price = 99.99, stock_quantity = 500.
SELECT product_name, price, stock_quantity
FROM products WHERE product_name = 'ZZZ-TEST Product';


-- ---------- 4. DELETE + CASCADE ----------
-- This is the untested one. Deleting the product should automatically
-- remove its product_images, search_terms, and product_tags rows too
-- (all declared ON DELETE CASCADE in schema.sql) — nothing orphaned.
DELETE FROM products WHERE product_name = 'ZZZ-TEST Product';

-- Expect: ALL FOUR of these return 0 rows. If any comes back non-zero,
-- the cascade did not work as declared and needs investigating.
SELECT * FROM products      WHERE product_name = 'ZZZ-TEST Product';
SELECT * FROM product_images WHERE image_url = 'https://example.com/test.jpg';
SELECT * FROM search_terms   WHERE search_term = 'zzz test term';
SELECT pt.* FROM product_tags pt
    JOIN tags t ON t.tag_id = pt.tag_id WHERE t.tag_name = 'zzz-test-tag';

-- Clean up the test category and tag too (products/images/terms/tags
-- already gone via cascade — this just removes the two rows that
-- don't cascade automatically: the category and the standalone tag).
DELETE FROM categories WHERE category_name = 'ZZZ-TEST Category';
DELETE FROM tags WHERE tag_name = 'zzz-test-tag';

-- Final check — should show your real 30 products, no test data.
SELECT COUNT(*) AS total_products FROM products;
