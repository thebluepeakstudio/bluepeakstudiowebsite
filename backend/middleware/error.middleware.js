const ApiError = require("../utils/ApiError");
const { isAllowedOrigin } = require("../utils/corsOrigins");

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
}

const errorHandler = (err, req, res, next) => {
  applyCorsHeaders(req, res);

  const isProd = process.env.NODE_ENV === "production";
  const correlationId = req.correlationId || "unknown";

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.message?.startsWith("Not allowed by CORS:")) {
    statusCode = 403;
    message = "Origin not allowed";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value";
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File too large (max 10 MB)";
  }

  if (
    err.message === "File type not allowed" ||
    err.message === "Only JPG, JPEG, PNG, and WEBP images are allowed"
  ) {
    statusCode = 400;
    message = err.message;
  }

  if (isProd && statusCode >= 500) {
    message = "An unexpected error occurred. Please try again.";
  }

  console.error("[error]", {
    correlationId,
    statusCode,
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    ...(isProd ? {} : { stack: err.stack }),
  });

  const body = {
    success: false,
    message,
    correlationId,
  };

  if (!isProd && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
