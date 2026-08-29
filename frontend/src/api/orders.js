import api from "./client";

// ── Orders ────────────────────────────────────────────────────
export const getMyOrders = () =>
  api.get("/orders");

export const getOrder = (id) =>
  api.get(`/orders/${id}`);

export const createOrder = (data) =>
  api.post("/orders", data);

export const createGuestOrder = (data) =>
  api.post("/orders/guest", data);

// ── Payment proof (Phase 3) ─────────────────────────────────────
// Submits a screenshot and/or a note for an order's invoice. At
// least one of the two is required — pass whichever the customer
// filled in; `file` may be omitted (null/undefined) if they only
// left a note.
export const submitPaymentProof = (orderId, { file, note } = {}) => {
  const formData = new FormData();
  if (file) formData.append("screenshot", file);
  if (note) formData.append("note", note);

  return api.post(`/orders/${orderId}/invoice/payment`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};