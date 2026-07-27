import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const client = axios.create({ baseURL: API_BASE_URL });

// Anonymous per-browser session id — same visit-tracking design as
// the database's product_views table already supports. Not tied to
// a real customer login (that's a separate, not-yet-built feature).
export function getSessionId() {
  let sessionId = localStorage.getItem("s2h_session_id");
  if (!sessionId) {
    sessionId = "web-" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("s2h_session_id", sessionId);
  }
  return sessionId;
}

// API 1 — GET /api/products/:id
export async function getProduct(productId) {
  const sessionId = getSessionId();
  const res = await client.get(`/api/products/${productId}`, {
    params: { session_id: sessionId },
  });
  return res.data;
}

// API 2 — GET /api/related?product_id=X
export async function getRelatedByProductId(productId) {
  const sessionId = getSessionId();
  const res = await client.get("/api/related", {
    params: { product_id: productId, session_id: sessionId },
  });
  return res.data;
}

// API 3 — GET /api/search?keyword=X
// Real multi-result search — returns every direct match, not a
// single top match plus its related items (see /api/related for that).
export async function searchProducts(keyword) {
  const res = await client.get("/api/search", { params: { keyword } });
  return res.data;
}

// API 4 — GET /api/recently-viewed?session_id=X&exclude=Y
// THIS visitor's own view history, not the aggregate cross-visitor
// signal get_related_products() uses.
export async function getRecentlyViewed(excludeProductId) {
  const sessionId = getSessionId();
  const res = await client.get("/api/recently-viewed", {
    params: { session_id: sessionId, exclude: excludeProductId },
  });
  return res.data;
}

// API 2 — GET /api/related?keyword=X
export async function searchByKeyword(keyword) {
  const sessionId = getSessionId();
  const res = await client.get("/api/related", {
    params: { keyword, session_id: sessionId },
  });
  return res.data;
}