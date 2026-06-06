import api from "./axiosInstance";

export const getFreelancers = (params) => api.get("/freelancers", { params });
export const getFreelancer = (id) => api.get(`/freelancers/${id}`);
export const getFreelancerProjects = (id, params) => api.get(`/freelancers/${id}/projects`, { params });
export const getFreelancerPayments = (id) => api.get(`/freelancers/${id}/payments`);
export const recordFreelancerPayment = (id, data) =>
  api.post(`/freelancers/${id}/payments`, data);
export const createFreelancer = (data) => api.post("/freelancers", data);
export const updateFreelancer = (id, data) => api.put(`/freelancers/${id}`, data);
export const deleteFreelancer = (id) => api.delete(`/freelancers/${id}`);
