-- ============================================================
-- product_views — records every product page visit
-- ============================================================
-- session_id is an anonymous per-visitor token (a UUID generated
-- client-side and stored in a cookie/localStorage) — NOT a login.
-- This is the standard pattern: "customers who viewed this also
-- viewed" works before a customer ever creates an account, exactly
-- like the reference site the mentor showed.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_views (
    view_id     SERIAL PRIMARY KEY,
    session_id  VARCHAR(100) NOT NULL,
    product_id  INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    viewed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_views_session ON product_views (session_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views (product_id);

-- Called once per product page load, from the application layer:
--   SELECT log_product_view('session-uuid-here', 42);
CREATE OR REPLACE FUNCTION log_product_view(p_session_id VARCHAR, p_product_id INT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO product_views (session_id, product_id) VALUES (p_session_id, p_product_id);
END;
$$ LANGUAGE plpgsql;
