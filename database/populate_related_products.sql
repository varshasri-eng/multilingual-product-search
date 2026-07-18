-- ============================================================
-- Auto-populate related_products from product_code prefixes
-- Run AFTER database/add_product_code.sql
-- ============================================================
-- Two tiers of relatedness, both derived from the code — no manual
-- pairing required:
--   'same_subtype'  — first 7 chars match  (e.g. 'PIK-VEG' == 'PIK-VEG')
--   'same_category' — first 3 chars match, but not same_subtype
--                     (e.g. 'GRO' == 'GRO' but 'GRN' != 'NUT')
-- same_subtype is the stronger signal and should be preferred by the
-- application when both are available for a given product.

-- Tier 1: same subtype (closest relation)
INSERT INTO related_products (product_id, related_product_id, relation_type)
SELECT
    p1.product_id,
    p2.product_id,
    'same_subtype'
FROM products p1
JOIN products p2
    ON p1.product_id <> p2.product_id
    AND LEFT(p1.product_code, 7) = LEFT(p2.product_code, 7)   -- e.g. 'PIK-VEG'
WHERE p1.product_code IS NOT NULL AND p2.product_code IS NOT NULL
ON CONFLICT (product_id, related_product_id) DO NOTHING;

-- Tier 2: same category, different subtype (looser relation) —
-- only added when a same_subtype relation doesn't already cover it.
INSERT INTO related_products (product_id, related_product_id, relation_type)
SELECT
    p1.product_id,
    p2.product_id,
    'same_category'
FROM products p1
JOIN products p2
    ON p1.product_id <> p2.product_id
    AND LEFT(p1.product_code, 3) = LEFT(p2.product_code, 3)   -- e.g. 'LEA'
    AND LEFT(p1.product_code, 7) <> LEFT(p2.product_code, 7)  -- different subtype
WHERE p1.product_code IS NOT NULL AND p2.product_code IS NOT NULL
ON CONFLICT (product_id, related_product_id) DO NOTHING;

-- Verify: see what got generated for one product as a sanity check.
SELECT
    p1.product_name AS product,
    p1.product_code,
    p2.product_name AS related_to,
    p2.product_code AS related_code,
    rp.relation_type
FROM related_products rp
JOIN products p1 ON p1.product_id = rp.product_id
JOIN products p2 ON p2.product_id = rp.related_product_id
WHERE p1.product_name = 'Bittergourd Pickle'
ORDER BY rp.relation_type, p2.product_name;
