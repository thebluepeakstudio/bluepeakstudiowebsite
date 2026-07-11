const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return res.status(dbReady ? 200 : 503).json({
      status: dbReady ? "ok" : "degraded",
    });
  }

  const { version } = require("../package.json");
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? "ok" : "degraded",
    service: "bluepeak-api",
    version,
    db: dbReady ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
