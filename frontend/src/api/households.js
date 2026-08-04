import api from "./client";

// ── Family groups (households) ───────────────────────────────
export const getMyHousehold = () =>
  api.get("/households/mine");

export const createHousehold = (name) =>
  api.post("/households", { name });

export const joinHousehold = (inviteCode) =>
  api.post("/households/join", { invite_code: inviteCode });

export const leaveHousehold = () =>
  api.post("/households/leave");
