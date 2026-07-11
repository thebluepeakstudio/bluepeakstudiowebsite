const AdminAuditLog = require("../models/AdminAuditLog");

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Fire-and-forget security audit log. Never throws to callers.
 */
async function logAuditEvent(
  req,
  { action, resource, resourceId, success = true, meta, adminId, adminEmail } = {}
) {
  try {
    const admin = req.admin;
    await AdminAuditLog.create({
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : "",
      success,
      adminId: adminId || admin?._id || null,
      adminEmail: adminEmail || admin?.email || meta?.attemptedEmail || "",
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
      correlationId: req.correlationId || "",
      meta: meta || null,
    });
  } catch (err) {
    console.error("[audit-log] Failed to write entry:", err.message);
  }
}

function logAuditEventAsync(req, payload) {
  logAuditEvent(req, payload).catch(() => {});
}

module.exports = { logAuditEvent, logAuditEventAsync, getClientIp };
