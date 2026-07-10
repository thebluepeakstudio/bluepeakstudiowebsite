import api from "./axiosInstance";

export const getServices = (params) => api.get("/services", { params });
export const getServiceSummary = () => api.get("/services/summary");
export const getService = (id, params) => api.get(`/services/${id}`, { params });
export const createService = (data) => api.post("/services", data);
export const createServiceWithDeliverables = (payload) => api.post("/services", payload);
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);
export const downloadServiceInvoice = (id) =>
  api.get(`/services/${id}/invoice`, { responseType: "blob" });

export const getRecurringConfig = (id) => api.get(`/services/${id}/recurring-config`);
export const patchRecurringConfig = (id, data) => api.patch(`/services/${id}/recurring-config`, data);
export const getBillingCycles = (id) => api.get(`/services/${id}/billing-cycles`);
export const getServiceWallet = (id) => api.get(`/services/${id}/wallet`);
export const createTemplateDeliverable = (id, data) =>
  api.post(`/services/${id}/template-deliverables`, data);
export const updateTemplateDeliverable = (id, templateId, data) =>
  api.put(`/services/${id}/template-deliverables/${templateId}`, data);
export const deleteTemplateDeliverable = (id, templateId) =>
  api.delete(`/services/${id}/template-deliverables/${templateId}`);
export const updateCycleDeliverable = (id, cycleId, deliverableId, data) =>
  api.patch(`/services/${id}/billing-cycles/${cycleId}/deliverables/${deliverableId}`, data);
export const payCycleFreelancerDue = (id, cycleId, dueId, data) =>
  api.post(`/services/${id}/billing-cycles/${cycleId}/freelancer-dues/${dueId}/pay`, data);
export const downloadCycleInvoice = (id, cycleId) =>
  api.get(`/services/${id}/billing-cycles/${cycleId}/invoice`, { responseType: "blob" });

export const uploadServiceFiles = (id, files) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return api.post(`/services/${id}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Legacy aliases — prefer service* names in new code
export {
  getServices as getProjects,
  getServiceSummary as getProjectSummary,
  getService as getProject,
  createService as createProject,
  createServiceWithDeliverables as createProjectWithDeliverables,
  updateService as updateProject,
  deleteService as deleteProject,
  downloadServiceInvoice as downloadProjectInvoice,
  getServiceWallet as getProjectWallet,
  uploadServiceFiles as uploadProjectFiles,
};
