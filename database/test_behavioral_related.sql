-- ============================================================
-- get_related_products() — powers the listing page's "related
-- products" section, exactly as the mentor described: category
-- first, then search/visit history.
-- ============================================================
-- Run AFTER add_product_views.sql
--
-- Usage from the future API layer:
--   SELECT * FROM get_related_products(<product_id>, '<session_id>');
--   SELECT * FROM get_related_products(<product_id>, NULL);  -- no session yet
-- ============================================================

CREATE OR REPLACE FUNCTION get_related_products(
    p_product_id INT,
    p_session_id VARCHAR DEFAULT NULL,
    p_limit INT DEFAULT 6
)
RETURNS TABLE (
    product_id    INT,
    product_name  VARCHAR,
    source        VARCHAR,   -- 'history' or 'category' — which signal found it
    score         INT
) AS $$
BEGIN
    RETURN QUERY
    WITH co_viewed AS (
        -- Behavioral: other products viewed in the SAME session as this
        -- one, across ALL visitors who ever viewed p_product_id — this
        -- is the "customers who viewed this also viewed" signal.
        SELECT pv2.product_id AS pid, COUNT(DISTINCT pv1.session_id) AS view_count
        FROM product_views pv1
        JOIN product_views pv2
            ON pv1.session_id = pv2.session_id
            AND pv1.product_id <> pv2.product_id
        WHERE pv1.product_id = p_product_id
        GROUP BY pv2.product_id
    ),
    structural AS (
        -- Category-based: the existing related_products table
        -- (same_subtype > shared_tag > same_category, in that priority).
        SELECT rp.related_product_id AS pid,
               CASE rp.relation_type
                   WHEN 'same_subtype' THEN 3
                   WHEN 'shared_tag'   THEN 2
                   WHEN 'same_category' THEN 1
                   ELSE 0
               END AS rank_weight
        FROM related_products rp
        WHERE rp.product_id = p_product_id
    )
    SELECT
        p.product_id,
        p.product_name,
        CASE WHEN cv.pid IS NOT NULL THEN 'history' ELSE 'category' END::VARCHAR AS source,
        (COALESCE(cv.view_count, 0) * 10 + COALESCE(s.rank_weight, 0))::INT AS score
    FROM products p
    LEFT JOIN co_viewed cv ON cv.pid = p.product_id
    LEFT JOIN structural s ON s.pid = p.product_id
    WHERE p.product_id <> p_product_id
      AND (cv.pid IS NOT NULL OR s.pid IS NOT NULL)
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
