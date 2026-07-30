-- ============================================================
-- Migration: delivery scheduling rules + admin role
-- ============================================================

-- Per-product delivery/restock rules. One row per product; products
-- without a row here just fall back to "always available, no
-- scheduling restriction" (handled in application logic, not SQL).
CREATE TABLE IF NOT EXISTS product_delivery_rules (
    product_id            INT PRIMARY KEY REFERENCES products(product_id) ON DELETE CASCADE,
    restock_cycle         VARCHAR(20) NOT NULL DEFAULT 'none'
                           CHECK (restock_cycle IN ('weekly', 'monthly', 'none')),
    restock_day_of_week   INT CHECK (restock_day_of_week BETWEEN 0 AND 6),  -- 0=Sunday..6=Saturday, used when restock_cycle='weekly'
    restock_day_of_month  INT CHECK (restock_day_of_month BETWEEN 1 AND 31), -- used when restock_cycle='monthly'
    min_lead_days         INT NOT NULL DEFAULT 3,  -- minimum days out, even when in stock
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin capability — customers table currently has no concept of
-- roles at all. Defaulting everyone to 'customer'; promote to admin
-- manually via SQL for now (no admin-invite flow built yet).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin'));

-- Worked example matching the mentor's exact scenario: Henna
-- (Mehandi Leaves) restocks every Wednesday, needs 3 days lead time
-- once available.
INSERT INTO product_delivery_rules (product_id, restock_cycle, restock_day_of_week, min_lead_days)
SELECT product_id, 'weekly', 3, 3  -- 3 = Wednesday (0=Sunday)
FROM products WHERE product_name = 'Mehandi Leaves (Fresh)'
ON CONFLICT (product_id) DO NOTHING;

-- Second example: Turmeric Powder, monthly restock (1st of the month),
-- proving the rule structure handles both cycle types.
INSERT INTO product_delivery_rules (product_id, restock_cycle, restock_day_of_month, min_lead_days)
SELECT product_id, 'monthly', 1, 5
FROM products WHERE product_name = 'Turmeric Powder'
ON CONFLICT (product_id) DO NOTHING;

-- Verify.
SELECT p.product_name, r.restock_cycle, r.restock_day_of_week, r.restock_day_of_month, r.min_lead_days
FROM product_delivery_rules r
JOIN products p ON p.product_id = r.product_id;
