import api from "./client";

// ── Products & categories ────────────────────────────────────
export const getProducts = (params = {}) =>
  api.get("/products", { params });

export const getCategories = () =>
  api.get("/products/categories");

export const getProduct = (id, sessionId) =>
  api.get(`/products/${id}`, { params: { session_id: sessionId } });

export const getRelated = (id, sessionId) =>
  api.get(`/products/${id}/related`, { params: { session_id: sessionId } });

export const getRecentlyViewed = (sessionId) =>
  api.get("/products/recently-viewed", { params: { session_id: sessionId } });

// orderType ("delivery" | "pickup") is forwarded to the backend so
// earliest_delivery_date reflects the correct lead time: delivery
// gets the product's configured min_lead_days added on top, pickup
// does not (ready today if in stock, or as soon as restocked if not).
// Defaults to "delivery" to match the backend's default and existing
// callers that don't care about fulfillment type (e.g. the plain
// product detail page).
export const getAvailability = (id, quantity = 1, orderType = "delivery") =>
  api.get(`/products/${id}/availability`, {
    params: { quantity, order_type: orderType },
  });

// ── Session id for anonymous view tracking ───────────────────
export const getSessionId = () => {
  let sid = localStorage.getItem("s2h_session");
  if (!sid) {
    sid = (crypto.randomUUID && crypto.randomUUID()) ||
          `s${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("s2h_session", sid);
  }
  return sid;
};