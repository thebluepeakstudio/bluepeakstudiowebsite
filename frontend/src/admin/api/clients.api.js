import api from "./axiosInstance";

export const getClients = (params) => api.get("/clients", { params });
export const getClient = (id) => api.get(`/clients/${id}`);
export const getClientOverview = (id) => api.get(`/clients/${id}/overview`);
export const getClientProjects = (id) => api.get(`/clients/${id}/projects`);
export const getClientActivities = (id) => api.get(`/clients/${id}/activities`);
export const getClientAttachments = (id) => api.get(`/clients/${id}/attachments`);
export const createClient = (data) => api.post("/clients", data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);
export const logClientActivity = (id, data) => api.post(`/clients/${id}/activities`, data);
export const uploadClientAttachments = (id, formData) =>
  api.post(`/clients/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteClientAttachment = (id, attachmentId) =>
  api.delete(`/clients/${id}/attachments/${attachmentId}`);
