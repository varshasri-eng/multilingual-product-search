import api from "./client";

// ── Site settings (branding) ─────────────────────────────
export const getSettings = () =>
  api.get("/settings");

export const updateSettings = (data) =>
  api.put("/settings", data);
