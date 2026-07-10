import api from "./axiosInstance";

export const previewClientPayment = (data) => api.post("/client-payments/preview", data);
export const createClientPayment = (data) => api.post("/client-payments", data);
export const getClientPayments = (clientId) => api.get(`/client-payments/client/${clientId}`);