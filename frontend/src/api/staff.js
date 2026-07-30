import api from "./client";

// ── Staff self-registration (public) ────────────────────────
export const staffRegister = (data) =>
  api.post("/staff/register", data);

// ── Pending requests ─────────────────────────────────────────
export const getPendingStaff = () =>
  api.get("/staff/pending");

// ── All staff ────────────────────────────────────────────────
export const getAllStaff = () =>
  api.get("/staff/all");

// ── Approve ──────────────────────────────────────────────────
export const approveStaff = (id, permission) =>
  api.put(`/staff/${id}/approve`, { permission });

// ── Reject ───────────────────────────────────────────────────
export const rejectStaff = (id, reason) =>
  api.put(`/staff/${id}/reject`, { reason });

// ── Change permission ────────────────────────────────────────
export const changePermission = (id, permission) =>
  api.put(`/staff/${id}/permission`, { permission });

// ── Revoke access ────────────────────────────────────────────
export const revokeStaff = (id) =>
  api.put(`/staff/${id}/revoke`);
