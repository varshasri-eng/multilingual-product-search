-- ============================================================
-- Migration: add product_code to an already-running database
-- Safe to re-run — ADD COLUMN IF NOT EXISTS, and every UPDATE
-- only touches rows where product_code IS still NULL.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR(30);

-- Backfill codes for all 29 Phase-1/2 products.
-- Format: CATEGORY-SUBTYPE-SEQUENCE
UPDATE products SET product_code = v.code
FROM (VALUES
    ('Betel Leaves',                    'LEA-RIT-001'),
    ('Mango Leaves',                    'LEA-RIT-002'),
    ('Neem Leaves',                     'LEA-RIT-003'),
    ('Bhel Patra',                      'LEA-RIT-004'),
    ('Mehandi Leaves (Fresh)',          'LEA-COS-001'),

    ('Turmeric Powder',                 'SPI-PWD-001'),

    ('Amla Pickle',                     'PIK-VEG-001'),
    ('Andhra Avakaya Pickle (Mango)',   'PIK-VEG-002'),
    ('Andhra Tomato Pickle',            'PIK-VEG-003'),
    ('Bittergourd Pickle',              'PIK-VEG-004'),
    ('Brinjal Pickle',                  'PIK-VEG-005'),
    ('Gongura Pickle',                  'PIK-VEG-006'),
    ('Green Chilli Pickle',             'PIK-VEG-007'),
    ('Karivepaku Pickle',               'PIK-VEG-008'),
    ('Kothimeera Pickle',               'PIK-VEG-009'),
    ('Drumstick Pickle',                'PIK-VEG-010'),

    ('Anand Finger Millets',            'GRO-GRN-001'),
    ('Anand Little Millet',             'GRO-GRN-002'),
    ('Deep Sooji Rava',                 'GRO-GRN-003'),
    ('Bambino Roasted Vermicelli',      'GRO-GRN-004'),
    ('Premium Small Peanuts',           'GRO-NUT-001'),

    ('Idli Karam Podi',                 'KAR-PWD-001'),
    ('Kandi Karam Podi',                'KAR-PWD-002'),
    ('Karivepaku Karam Podi',           'KAR-PWD-003'),
    ('Kobbari Karam Podi',              'KAR-PWD-004'),
    ('Kothimeera Karam Podi',           'KAR-PWD-005'),
    ('Nuvvula Karam Podi',              'KAR-PWD-006'),
    ('Palli Karam Podi',                'KAR-PWD-007'),
    ('Pudina Karam Podi',               'KAR-PWD-008')
) AS v(product_name, code)
WHERE products.product_name = v.product_name
  AND products.product_code IS NULL;

-- Enforce uniqueness once backfilled (safe no-op if it already exists).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_product_code_key'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_product_code_key UNIQUE (product_code);
    END IF;
END $$;

-- Quick check: any product still missing a code?
SELECT product_name FROM products WHERE product_code IS NULL;
