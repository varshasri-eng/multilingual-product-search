-- ============================================================
-- Seed Data — Phase 1 (single product, per mentor's guidance)
-- ============================================================

-- Categories
INSERT INTO categories (category_name, description) VALUES
    ('Leaves', 'Fresh and dried leaf products'),
    ('Natural Hair Care', 'Traditional hair care botanicals')
ON CONFLICT (category_name) DO NOTHING;

-- Product: the real Mehandi/Gorintaku entry from the store spreadsheet
-- (NOT EXISTS guard, not ON CONFLICT — products has no unique constraint
-- on product_name, so ON CONFLICT would have no arbiter to match against
-- and this insert would silently duplicate on every re-run.)
INSERT INTO products (category_id, product_name, scientific_name, description, price, stock_quantity, image_url)
SELECT
    category_id,
    'Mehandi Leaves (Fresh)',
    'Lawsonia inermis',
    'Freshly harvested Mehandi (Gorintaku) leaves, carefully packed for freshness. Ideal for preparing natural henna paste and for use during traditional festivals, pujas, weddings, and other auspicious occasions.',
    18.00,
    93,
    NULL
FROM categories
WHERE category_name = 'Leaves'
  AND NOT EXISTS (
      SELECT 1 FROM products WHERE product_name = 'Mehandi Leaves (Fresh)'
  );

-- Search terms — official name, regional names, aliases, common typos, hashtags
-- Same alias set used in the CLI proof-of-concept, now in the database.
INSERT INTO search_terms (product_id, search_term, term_type, language)
SELECT product_id, term, term_type, language
FROM products, (VALUES
    ('mehandi leaves',      'official', NULL),
    ('mehandi',             'alias',    'Hindi'),
    ('mehendi',             'alias',    'Hindi'),
    ('henna',               'alias',    NULL),
    ('heena',               'alias',    NULL),
    ('gorintaku',           'regional', 'Telugu'),
    ('goranti',             'regional', 'Telugu'),
    ('marudhani',           'regional', 'Tamil'),
    ('marutham',            'regional', 'Tamil'),
    ('lawsonia inermis',    'alias',    NULL),
    ('gorintuku',           'typo',     NULL),
    ('gorantaku',           'typo',     NULL),
    ('gointaku',             'typo',     NULL),
    ('grointaku',            'typo',     NULL),
    ('#henna',              'hashtag',  NULL),
    ('#mehendi',            'hashtag',  NULL),
    ('#gorintaku',          'hashtag',  NULL),
    ('#naturaldye',         'hashtag',  NULL)
) AS terms(term, term_type, language)
WHERE products.product_name = 'Mehandi Leaves (Fresh)'
ON CONFLICT (product_id, search_term) DO NOTHING;
