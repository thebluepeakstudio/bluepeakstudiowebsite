/**
 * Production-only entry selector for index.html on the CRM subdomain.
 * In development, always loads the marketing app (CRM lives at /admin-panel).
 */
const hostname = window.location.hostname;
const isProductionCrm =
  !import.meta.env.DEV &&
  (hostname === "crm.bluepeakstudio.in" ||
    (hostname.startsWith("crm.") && hostname.endsWith(".bluepeakstudio.in")));

if (isProductionCrm) {
  import("./crm-main.jsx");
} else {
  import("./main.jsx");
}
