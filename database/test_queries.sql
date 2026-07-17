-- ============================================================
-- Test queries for search_products()
-- Run these one at a time in pgAdmin's Query Tool after running
-- database/search_function.sql
-- ============================================================

-- 1. Typo on product 1 — should return Mehandi Leaves via the
--    'typo' row, but ranked below any official/alias hit if one exists.
SELECT * FROM search_products('gorintuku');

-- 2. Typo on product 2 — proves the function isn't hardcoded to one
--    product; this is the discrimination test we didn't have before.
SELECT * FROM search_products('tumeric');

-- 3. Regional name — Telugu name for turmeric, should resolve cleanly.
SELECT * FROM search_products('pasupu');

-- 4. Hashtag search.
SELECT * FROM search_products('#gorintaku');

-- 5. No match at all — proves the fallback path. This should return
--    zero rows from the SELECT, but STILL write a row to search_logs
--    with result_found = false. That logged row is exactly the signal
--    described in Proposal §4.1 for "which alias is missing."
SELECT * FROM search_products('ashwagandha powder');

-- 6. Check what actually got logged — should show 5 rows, with the
--    last one (ashwagandha) marked result_found = false.
SELECT search_query, matched_product_id, result_found, searched_at
FROM search_logs
ORDER BY searched_at DESC
LIMIT 10;

-- 7. The zero-result rows are the ones worth reviewing regularly —
--    each one is a real customer search that needs a new search_terms
--    entry. This is the query you'd run periodically to find gaps.
SELECT search_query, COUNT(*) AS times_searched
FROM search_logs
WHERE result_found = FALSE
GROUP BY search_query
ORDER BY times_searched DESC;
