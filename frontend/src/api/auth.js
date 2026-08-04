import api from "./client";

export const register = (data) =>
  api.post("/auth/register", data);

export const login = (identifier, password) =>
  api.post("/auth/login", { email: identifier, password });

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (email, token, password) =>
  api.post("/auth/reset-password", { email, token, password });

export const logout = () =>
  api.post("/auth/logout");

export const getMe = () =>
  api.get("/auth/me");
