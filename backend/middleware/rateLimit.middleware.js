const RateLimitEntry = require("../models/RateLimitEntry");
const asyncHandler = require("../utils/asyncHandler");

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, keyPrefix = "default" } = {}) {
  return asyncHandler(async (req, res, next) => {
    const ip = getClientIp(req);
    const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
    const key = `${keyPrefix}:${ip}:${windowStartMs}`;
    const expiresAt = new Date(windowStartMs + windowMs);

    try {
      const entry = await RateLimitEntry.findOneAndUpdate(
        { key },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true }
      );

      if (entry.count > max) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
      }
    } catch (err) {
      if (err.code === 11000) {
        const entry = await RateLimitEntry.findOneAndUpdate(
          { key },
          { $inc: { count: 1 } },
          { new: true }
        );
        if (entry?.count > max) {
          return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
          });
        }
      } else {
        throw err;
      }
    }

    next();
  });
}

const publicFormRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "public-form",
});

const loginRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: "auth-login",
});

module.exports = { createRateLimiter, publicFormRateLimit, loginRateLimit };
