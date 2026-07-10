const STATIC_ALLOWED_ORIGINS = [
  "https://bluepeakstudiowebsite.onrender.com",
  "https://bluepeakstudiowebsite-1.onrender.com",
  "https://bluepeakstudiowebsite-cx3r.onrender.com",
  "https://bluepeakstudio.in",
  "https://www.bluepeakstudio.in",
  "https://crm.bluepeakstudio.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://crm.localhost:5173",
];

function parseExtraOrigins() {
  const raw = process.env.CORS_EXTRA_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "crm.localhost"
    );
  } catch {
    return false;
  }
}

function isBluePeakStudioOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return hostname === "bluepeakstudio.in" || hostname.endsWith(".bluepeakstudio.in");
  } catch {
    return false;
  }
}

function isRenderStaticOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    return hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  if (parseExtraOrigins().includes(origin)) return true;
  if (isBluePeakStudioOrigin(origin)) return true;
  if (isLocalDevOrigin(origin)) return true;
  if (isRenderStaticOrigin(origin)) return true;
  return false;
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) {
    callback(null, origin || true);
    return;
  }
  console.warn(`[cors] Blocked origin: ${origin}`);
  callback(null, false);
}

module.exports = {
  corsOrigin,
  isAllowedOrigin,
};
