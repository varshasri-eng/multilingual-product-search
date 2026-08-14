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

// ── Search insights ──────────────────────────────────────────
export const getSearchLogs = (params = {}) =>
  api.get("/admin/search-logs", { params });

export const addSearchTerm = (data) =>
  api.post("/admin/search-terms", data);
