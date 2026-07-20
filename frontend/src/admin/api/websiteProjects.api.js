import api from "./axiosInstance";

export const getWebsiteProjects = (params) => api.get("/website-projects", { params });
export const getWebsiteProject = (id) => api.get(`/website-projects/${id}`);
export const createWebsiteProject = (data) => api.post("/website-projects", data);
export const updateWebsiteProject = (id, data) => api.put(`/website-projects/${id}`, data);
export const deleteWebsiteProject = (id) => api.delete(`/website-projects/${id}`);
