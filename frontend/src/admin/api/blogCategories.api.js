import api from "./axiosInstance";

export const getBlogCategories = () => api.get("/blog-categories");
export const getBlogCategory = (id) => api.get(`/blog-categories/${id}`);
export const createBlogCategory = (data) => api.post("/blog-categories", data);
export const updateBlogCategory = (id, data) => api.put(`/blog-categories/${id}`, data);
export const deleteBlogCategory = (id) => api.delete(`/blog-categories/${id}`);
