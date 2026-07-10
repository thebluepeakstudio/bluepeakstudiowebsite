import api from "./axiosInstance";

export const getDeliverables = (projectId) => api.get(`/services/${projectId}/deliverables`);
export const createDeliverable = (projectId, data) =>
  api.post(`/services/${projectId}/deliverables`, data);
export const updateDeliverable = (projectId, deliverableId, data) =>
  api.put(`/services/${projectId}/deliverables/${deliverableId}`, data);
export const deleteDeliverable = (projectId, deliverableId) =>
  api.delete(`/services/${projectId}/deliverables/${deliverableId}`);

export const createAssignment = (projectId, deliverableId, data) =>
  api.post(`/services/${projectId}/deliverables/${deliverableId}/assignments`, data);
export const updateAssignment = (projectId, deliverableId, assignmentId, data) =>
  api.put(`/services/${projectId}/deliverables/${deliverableId}/assignments/${assignmentId}`, data);
export const deleteAssignment = (projectId, deliverableId, assignmentId) =>
  api.delete(`/services/${projectId}/deliverables/${deliverableId}/assignments/${assignmentId}`);

export const getProjectPayments = (projectId) => api.get(`/services/${projectId}/payments`);
export const createProjectPayment = (projectId, data) =>
  api.post(`/services/${projectId}/payments`, data);
export const updateProjectPayment = (projectId, paymentId, data) =>
  api.put(`/services/${projectId}/payments/${paymentId}`, data);
export const deleteProjectPayment = (projectId, paymentId) =>
  api.delete(`/services/${projectId}/payments/${paymentId}`);

export const getProjectExpenses = (projectId) => api.get(`/services/${projectId}/expenses`);
