const AUTH_COOKIE_NAME = "bps_admin_token";
const { parseJwtExpiryMs } = require("./jwtConfig");

function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    // Cross-site CRM (crm.bluepeakstudio.in) → API on Render requires SameSite=None in prod.
    sameSite: isProd ? "none" : "lax",
    maxAge: parseJwtExpiryMs(),
    path: "/",
  };
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
