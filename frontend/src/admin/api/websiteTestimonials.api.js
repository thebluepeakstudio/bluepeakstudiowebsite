import api from "./axiosInstance";

export const getWebsiteTestimonials = (params) =>
  api.get("/website-testimonials", { params });
export const getWebsiteTestimonial = (id) => api.get(`/website-testimonials/${id}`);
export const createWebsiteTestimonial = (data) => api.post("/website-testimonials", data);
export const updateWebsiteTestimonial = (id, data) => api.put(`/website-testimonials/${id}`, data);
export const deleteWebsiteTestimonial = (id) => api.delete(`/website-testimonials/${id}`);
