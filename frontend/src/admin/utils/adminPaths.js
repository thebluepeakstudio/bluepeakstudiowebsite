export const PUBLIC_SITE_URL = "https://bluepeakstudio.in";
export const CRM_ORIGIN = "https://crm.bluepeakstudio.in";
export const DEV_ADMIN_BASE = "/admin-panel";

/** Production CRM subdomain — root-mounted routes, no /admin-panel prefix. */
export function isProductionCrmHost() {
  if (import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "crm.bluepeakstudio.in" ||
    (host.startsWith("crm.") && host.endsWith(".bluepeakstudio.in"))
  );
}

export function getAdminBasePath() {
  return isProductionCrmHost() ? "" : DEV_ADMIN_BASE;
}

export function adminHome() {
  return isProductionCrmHost() ? "/" : `${DEV_ADMIN_BASE}/dashboard`;
}

export function adminLogin() {
  return isProductionCrmHost() ? "/" : `${DEV_ADMIN_BASE}/login`;
}

export function adminPath(...segments) {
  const base = getAdminBasePath();
  const filtered = segments.filter((s) => s != null && s !== "");
  if (filtered.length === 0) return adminHome();
  const subPath = `/${filtered.map(String).join("/")}`;
  return base ? `${base}${subPath}` : subPath;
}

export function normalizeLegacyAdminPath(pathname) {
  if (!isProductionCrmHost()) return pathname;
  let path = pathname.replace(/^\/admin-panel\/?/, "/");
  if (path === "/dashboard" || path === "/login") return "/";
  if (path === "") return "/";
  return path;
}

export function getAdminPathSegments(pathname) {
  const base = getAdminBasePath();
  let path = pathname;
  if (base) {
    path = pathname.replace(new RegExp(`^${base}/?`), "/");
  }
  if (path === "/" || path === "") return [];
  return path.replace(/^\//, "").split("/").filter(Boolean);
}

/** @deprecated Use adminHome() */
export const ADMIN_HOME = "/";
