import api from "./client";

// ── Customer profile ─────────────────────────────────────────
export const getProfile = () =>
  api.get("/customers/profile");

export const updateProfile = (data) =>
  api.put("/customers/profile", data);

// ── Customer addresses ───────────────────────────────────────
export const getAddresses = () =>
  api.get("/customers/addresses");

export const addAddress = (data) =>
  api.post("/customers/addresses", data);

export const updateAddress = (id, data) =>
  api.put(`/customers/addresses/${id}`, data);

export const deleteAddress = (id) =>
  api.delete(`/customers/addresses/${id}`);

export const setDefaultAddress = (id) =>
  api.put(`/customers/addresses/${id}/default`);
