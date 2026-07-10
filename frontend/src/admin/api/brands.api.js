import api from "./axiosInstance";

export const getBrands = (params) => api.get("/brands", { params });
export const getBrand = (id) => api.get(`/brands/${id}`);
export const getBrandDashboard = (id) => api.get(`/brands/${id}/dashboard`);
export const createBrand = (data) => api.post("/brands", data);
export const updateBrand = (id, data) => api.put(`/brands/${id}`, data);
export const deleteBrand = (id) => api.delete(`/brands/${id}`);
export const moveServiceToBrand = (brandId, serviceId) =>
  api.post(`/brands/${brandId}/services/${serviceId}/move`);
