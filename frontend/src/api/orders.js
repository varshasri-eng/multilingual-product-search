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
