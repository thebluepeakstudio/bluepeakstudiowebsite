import api from "./axiosInstance";

export const getProjects = (params) => api.get("/projects", { params });
export const getProjectSummary = () => api.get("/projects/summary");
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post("/projects", data);
export const createProjectWithDeliverables = (payload) => api.post("/projects", payload);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const downloadProjectInvoice = (id) =>
  api.get(`/projects/${id}/invoice`, { responseType: "blob" });
export const uploadProjectFiles = (id, files) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return api.post(`/projects/${id}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
