import api from "./axiosInstance";

export const getDeliverables = (projectId) => api.get(`/projects/${projectId}/deliverables`);
export const createDeliverable = (projectId, data) =>
  api.post(`/projects/${projectId}/deliverables`, data);
export const updateDeliverable = (projectId, deliverableId, data) =>
  api.put(`/projects/${projectId}/deliverables/${deliverableId}`, data);
export const deleteDeliverable = (projectId, deliverableId) =>
  api.delete(`/projects/${projectId}/deliverables/${deliverableId}`);

export const createAssignment = (projectId, deliverableId, data) =>
  api.post(`/projects/${projectId}/deliverables/${deliverableId}/assignments`, data);
export const updateAssignment = (projectId, deliverableId, assignmentId, data) =>
  api.put(`/projects/${projectId}/deliverables/${deliverableId}/assignments/${assignmentId}`, data);
export const deleteAssignment = (projectId, deliverableId, assignmentId) =>
  api.delete(`/projects/${projectId}/deliverables/${deliverableId}/assignments/${assignmentId}`);

export const getProjectPayments = (projectId) => api.get(`/projects/${projectId}/payments`);
export const createProjectPayment = (projectId, data) =>
  api.post(`/projects/${projectId}/payments`, data);
export const updateProjectPayment = (projectId, paymentId, data) =>
  api.put(`/projects/${projectId}/payments/${paymentId}`, data);
export const deleteProjectPayment = (projectId, paymentId) =>
  api.delete(`/projects/${projectId}/payments/${paymentId}`);

export const getProjectExpenses = (projectId) => api.get(`/projects/${projectId}/expenses`);
