export const PUBLIC_SITE_URL = "https://bluepeakstudio.in";
export const CRM_ORIGIN = "https://crm.bluepeakstudio.in";
export const ADMIN_HOME = "/";

export function isCrmHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "crm.bluepeakstudio.in" ||
    host === "crm.localhost" ||
    import.meta.env.VITE_CRM_MODE === "true"
  );
}

export function adminPath(...segments) {
  const filtered = segments.filter((s) => s != null && s !== "");
  if (filtered.length === 0) return ADMIN_HOME;
  return `/${filtered.map(String).join("/")}`;
}

export function normalizeLegacyAdminPath(pathname) {
  let path = pathname.replace(/^\/admin-panel\/?/, "/");
  if (path === "/dashboard" || path === "/login") return ADMIN_HOME;
  if (path === "") return ADMIN_HOME;
  return path;
}

export function getAdminPathSegments(pathname) {
  const normalized = normalizeLegacyAdminPath(pathname);
  if (normalized === ADMIN_HOME) return [];
  return normalized.replace(/^\//, "").split("/").filter(Boolean);
}
