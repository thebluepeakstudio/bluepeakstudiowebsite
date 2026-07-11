import axios from "axios";
import { getApiBaseUrl } from "../../utils/apiBase";
import { adminLogin } from "../utils/adminPaths";

const backendUrl = getApiBaseUrl();

const baseURL = backendUrl ? `${backendUrl}/api/admin` : "/api/admin";

if (!backendUrl && import.meta.env.DEV) {
  console.warn(
    "[Admin] VITE_BACKEND_URL not set — using /api proxy. Add VITE_BACKEND_URL=http://localhost:10000 to frontend/.env"
  );
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      const loginPath = adminLogin();
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
