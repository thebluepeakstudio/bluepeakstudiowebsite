const AUTH_COOKIE_NAME = "bps_admin_token";
const { parseJwtExpiryMs } = require("./jwtConfig");

function isSecureDeployment() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    process.env.FORCE_SECURE_COOKIES === "true"
  );
}

function getAuthCookieOptions() {
  const secure = isSecureDeployment();
  return {
    httpOnly: true,
    secure,
    // Cross-site CRM (crm.bluepeakstudio.in) → API on Render requires SameSite=None when secure.
    sameSite: secure ? "none" : "lax",
    maxAge: parseJwtExpiryMs(),
    path: "/",
  };
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  const secure = isSecureDeployment();
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
  });
}

function readAuthToken(req) {
  if (req.cookies?.[AUTH_COOKIE_NAME]) return req.cookies[AUTH_COOKIE_NAME];
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
}

module.exports = {
  AUTH_COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  readAuthToken,
};
