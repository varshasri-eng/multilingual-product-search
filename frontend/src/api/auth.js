import api from "./client";

export const register = (data) =>
  api.post("/auth/register", data);

export const login = (identifier) =>
  api.post("/auth/login", { email: identifier });

export const verifyOtp = (identifier, otp) =>
  api.post("/auth/verify-otp", { email: identifier, otp });

export const logout = () =>
  api.post("/auth/logout");

export const getMe = () =>
  api.get("/auth/me");
