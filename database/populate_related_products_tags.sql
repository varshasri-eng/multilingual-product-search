-- ============================================================
-- Tag-based relatedness — run AFTER add_subcategory_and_tags.sql
-- and AFTER database/populate_related_products.sql
-- ============================================================
-- The code-prefix tiers (same_subtype / same_category) only find
-- relations WITHIN one category — e.g. two pickles, two Karam podis.
-- Tags catch relations ACROSS categories, which is exactly the case
-- the mentor's toor dal example is about: a Karam Podi and a dal
-- could both be tagged 'sambar ingredient' despite sitting in
-- completely different categories and subcategories.

INSERT INTO related_products (product_id, related_product_id, relation_type)
SELECT DISTINCT
    pt1.product_id,
    pt2.product_id,
    'shared_tag'
FROM product_tags pt1
JOIN product_tags pt2
    ON pt1.tag_id = pt2.tag_id
    AND pt1.product_id <> pt2.product_id
ON CONFLICT (product_id, related_product_id) DO NOTHING;

-- Verify: every relation type now present for Toor Dal, showing the
-- difference between structural (subtype/category) and tag-based
-- relatedness.
SELECT
    p2.product_name AS related_to,
    rp.relation_type
FROM related_products rp
JOIN products p1 ON p1.product_id = rp.product_id
JOIN products p2 ON p2.product_id = rp.related_product_id
WHERE p1.product_name = 'Toor Dal'
ORDER BY rp.relation_type, p2.product_name;
