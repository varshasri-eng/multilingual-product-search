import api from "./client";

// ── Customer list ────────────────────────────────────────────
export const listCustomers = (params = {}) =>
  api.get("/admin/customers", { params });

export const getCustomer = (id) =>
  api.get(`/admin/customers/${id}`);

export const editCustomer = (id, data) =>
  api.put(`/admin/customers/${id}`, data);

export const deactivateCustomer = (id) =>
  api.put(`/admin/customers/${id}/deactivate`);

export const activateCustomer = (id) =>
  api.put(`/admin/customers/${id}/activate`);

export const changeRole = (id, role) =>
  api.put(`/admin/customers/${id}/role`, { role });

export const getCustomerAddresses = (id) =>
  api.get(`/admin/customers/${id}/addresses`);

export const getCustomerOrders = (id) =>
  api.get(`/admin/customers/${id}/orders`);

export const deleteCustomer = (id) =>
  api.delete(`/admin/customers/${id}`);

export const getCustomerStats = () =>
  api.get("/admin/stats/customers");

// ── Order management ──────────────────────────────────────────
export const getAdminOrders = (params = {}) =>
  api.get("/admin/orders", { params });

export const removeOrderItem = (orderId, itemId) =>
  api.delete(`/admin/orders/${orderId}/items/${itemId}`);

export const replaceOrderItem = (orderId, itemId, data) =>
  api.put(`/admin/orders/${orderId}/items/${itemId}/replace`, data);

// ── Invoice management ───────────────────────────────────────
// raiseOrderInvoice creates a brand new invoice (POST). It must be
// called only on Save (never on Edit Invoice), and must carry the
// discount/tax settings the admin chose in the invoice editor.
export const raiseOrderInvoice = (orderId, data) =>
  api.post(`/admin/orders/${orderId}/invoice`, data);

// updateOrderInvoice updates an existing invoice (PUT).
export const updateOrderInvoice = (orderId, data) =>
  api.put(`/admin/orders/${orderId}/invoice`, data);

// ── Payment verification (Phase 3) ────────────────────────────
// Only valid when the invoice is currently "payment_submitted" —
// see orders.js's submitPaymentProof for how it gets there.
export const verifyOrderPayment = (orderId) =>
  api.put(`/admin/orders/${orderId}/invoice/verify`);

export const rejectOrderPayment = (orderId, reason) =>
  api.put(`/admin/orders/${orderId}/invoice/reject`, { reason });

// ── Payment settings (Phase 3) ────────────────────────────────
// The QR code + instructions shown on every invoice. Separate from
// site branding — admin-managed payment info, not a branding asset.
// NOTE: registered as a single blueprint/prefix (/api/payment-settings)
// just like settings_bp — GET is public (api/settings.js), PUT here
// is admin-gated server-side via @admin_required on the same path.
export const updatePaymentSettings = (data) =>
  api.put("/payment-settings", data);

// ── Delivery rules ──────────────────────────────────────────
// Per-product restock cycle + minimum lead time, used by
// /products/<id>/availability to compute earliest_delivery_date.
export const getProductDeliveryRule = (productId) =>
  api.get(`/admin/products/${productId}/delivery-rule`);

export const updateProductDeliveryRule = (productId, data) =>
  api.put(`/admin/products/${productId}/delivery-rule`, data);

// ── Search insights ──────────────────────────────────────────
export const getSearchLogs = (params = {}) =>
  api.get("/admin/search-logs", { params });

export const addSearchTerm = (data) =>
  api.post("/admin/search-terms", data);