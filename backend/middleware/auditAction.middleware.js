const { logAuditEventAsync } = require("../services/auditLog.service");

/**
 * Logs successful critical actions after the response completes.
 * Does not change request handling or responses.
 */
function auditAction(action, resource, { getResourceId } = {}) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      const resourceId = getResourceId ? getResourceId(req) : req.params.id;
      logAuditEventAsync(req, { action, resource, resourceId, success: true });
    });
    next();
  };
}

module.exports = { auditAction };
