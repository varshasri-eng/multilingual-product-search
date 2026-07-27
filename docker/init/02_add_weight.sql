-- ============================================================
-- Migration: add weight/pack-size to products
-- ============================================================
-- Only backfilling Mehandi Leaves here — its "100 gm" weight came
-- directly from the original store spreadsheet earlier in this
-- project. I don't have confirmed weight data for the other 29
-- products, so I'm deliberately NOT guessing values for them —
-- fabricated weights would be worse than missing ones. Fill the
-- rest via dataset/products.xlsx (see the new 'weight' column)
-- from your actual source spreadsheet, then re-run import_dataset.py.

ALTER TABLE products ADD COLUMN IF NOT EXISTS weight VARCHAR(50);

UPDATE products
SET weight = '100 gm'
WHERE product_name = 'Mehandi Leaves (Fresh)' AND weight IS NULL;

-- Shows every product still missing a confirmed weight — this list
-- is what needs filling in from the real catalog spreadsheet.
SELECT product_name, product_code FROM products WHERE weight IS NULL ORDER BY product_code;
