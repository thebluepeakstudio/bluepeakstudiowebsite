import api from "./axiosInstance";

export const getLeads = (params) => api.get("/leads", { params });
export const getKanban = (params) => api.get("/leads/kanban", { params });
export const getLeadMetrics = () => api.get("/leads/metrics");
export const getFollowUps = (due = "today") =>
  api.get("/leads/follow-ups", { params: { due } });
export const getLead = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post("/leads", data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const updateLeadStatus = (id, data) => api.patch(`/leads/${id}/status`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const bulkLeads = (data) => api.post("/leads/bulk", data);
export const getLeadActivities = (id) => api.get(`/leads/${id}/activities`);
export const logLeadActivity = (id, data) => api.post(`/leads/${id}/activities`, data);
export const getLeadStatusHistory = (id) => api.get(`/leads/${id}/status-history`);
export const getLeadAttachments = (id) => api.get(`/leads/${id}/attachments`);
export const uploadLeadAttachments = (id, formData) =>
  api.post(`/leads/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteLeadAttachment = (id, attachmentId) =>
  api.delete(`/leads/${id}/attachments/${attachmentId}`);
export const updateLeadFollowUp = (id, data) => api.patch(`/leads/${id}/follow-up`, data);
export const convertLead = (id) => api.post(`/leads/${id}/convert`);
