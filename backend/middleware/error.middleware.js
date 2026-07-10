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

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
