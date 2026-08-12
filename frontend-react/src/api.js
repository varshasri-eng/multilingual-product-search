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

// GET /api/related?keyword=X (legacy — kept since older code may
// still reference it, functionally superseded by searchProducts)
export async function searchByKeyword(keyword) {
  const sessionId = getSessionId();
  const res = await client.get("/api/related", {
    params: { keyword, session_id: sessionId },
  });
  return res.data;
}

// ---- Auth ----
export async function registerCustomer(name, email, password, phone) {
  const res = await client.post("/api/auth/register", { name, email, password, phone });
  return res.data; // { token, customer }
}

export async function loginCustomer(email, password) {
  const res = await client.post("/api/auth/login", { email, password });
  return res.data; // { token, customer }
}

export async function getCurrentCustomer(token) {
  const res = await client.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// API 5 — GET /api/products/:id/availability
// Returns in_stock status, restock_cycle, and the earliest valid
// delivery date, computed server-side (see backend delivery.py).
export async function getProductAvailability(productId) {
  const res = await client.get(`/api/products/${productId}/availability`);
  return res.data;
}

// API 7 — GET /api/orders/:id
// Customer-facing order lookup for the confirmation/track-order
// flow — the customer must own the order (or be admin). Includes
// items and an `invoice` field that's null until admin raises one.
export async function getOrder(token, orderId) {
  const res = await client.get(`/api/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ---- Admin: search log visibility + fixing missing terms ----
export async function getSearchLogs(token, onlyFailed = true, limit = 50) {
  const res = await client.get("/api/admin/search-logs", {
    params: { only_failed: onlyFailed, limit },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function addSearchTerm(token, productId, searchTerm, termType, language) {
  const res = await client.post(
    "/api/admin/search-terms",
    { product_id: productId, search_term: searchTerm, term_type: termType, language },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ---- Admin: orders ----
export async function getAdminOrders(token, status) {
  const res = await client.get("/api/admin/orders", {
    params: status ? { status } : {},
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ---- Admin: order item management ----
// Remove an item from a still-'pending' order (e.g. a product turns
// out to be unavailable during review). Returns the updated order
// with its recalculated total_amount and remaining items.
export async function removeOrderItem(token, orderId, orderItemId) {
  const res = await client.delete(
    `/api/admin/orders/${orderId}/items/${orderItemId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// Replace/adjust an item on a still-'pending' order. `updates` can
// include any subset of { product_id, quantity, delivery_date } —
// only send what actually changed:
//   - swap to a different product (e.g. same herb, different
//     brand): pass { product_id }, the server re-prices the line
//     from that product's current price
//   - correct a quantity (e.g. 2L ordered but only 1L available):
//     pass { quantity }, the per-unit price is left untouched
// Returns the updated order with its recalculated total_amount and
// items.
export async function replaceOrderItem(token, orderId, orderItemId, updates) {
  const res = await client.put(
    `/api/admin/orders/${orderId}/items/${orderItemId}`,
    updates,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}