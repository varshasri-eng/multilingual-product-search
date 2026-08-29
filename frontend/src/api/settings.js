import api from "./client";

// ── Site branding ────────────────────────────────────────────
export const getSettings = () =>
  api.get("/settings");

export const updateSettings = (data) =>
  api.put("/settings", data);

// ── Payment settings (Phase 3) ───────────────────────────────
// Public GET so the customer's invoice/payment view can load the
// QR + instructions without needing to be an admin. The admin-only
// update lives in api/admin.js (updatePaymentSettings), matching how
// getSettings/updateSettings are split for branding.
export const getPaymentSettings = () =>
  api.get("/payment-settings");