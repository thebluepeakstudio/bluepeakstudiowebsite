import api from "./axiosInstance";

export const login = (email, password) =>
  api.post("/auth/login", { email, password });
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");
export const getAdmins = () => api.get("/auth/admins");
