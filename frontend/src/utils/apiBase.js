/**
 * Resolves the backend origin for public API calls.
 * - Uses VITE_BACKEND_URL when set (without trailing /api — that is added per route).
 * - Falls back to "" so requests use same-origin /api/* (Vite proxy in dev).
 */
export function getApiBaseUrl() {
  let url = import.meta.env.VITE_BACKEND_URL?.trim();
  if (!url) return "";
  url = url.replace(/\/$/, "");
  if (url.endsWith("/api")) url = url.slice(0, -4);
  return url;
}

export function apiUrl(path) {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Ping backend on load to wake cold starts (e.g. Render free tier). */
export function wakeBackend() {
  const url = apiUrl("/api/health");
  const attempt = (left) => {
    fetch(url, { method: "GET", cache: "no-store" }).catch(() => {
      if (left > 1) {
        window.setTimeout(() => attempt(left - 1), 3000);
      }
    });
  };
  attempt(3);
}
