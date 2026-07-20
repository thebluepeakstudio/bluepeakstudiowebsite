import api from "./axiosInstance";

export const getWebsiteProjectCategories = () => api.get("/website-project-categories");
export const createWebsiteProjectCategory = (data) =>
  api.post("/website-project-categories", data);
export const updateWebsiteProjectCategory = (id, data) =>
  api.put(`/website-project-categories/${id}`, data);
export const deleteWebsiteProjectCategory = (id) =>
  api.delete(`/website-project-categories/${id}`);
