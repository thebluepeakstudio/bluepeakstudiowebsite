const crypto = require("crypto");

function correlationIdMiddleware(req, res, next) {
  const incoming = req.headers["x-correlation-id"];
  req.correlationId =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim().slice(0, 64)
      : crypto.randomUUID();
  res.setHeader("X-Correlation-Id", req.correlationId);
  next();
}

module.exports = correlationIdMiddleware;
