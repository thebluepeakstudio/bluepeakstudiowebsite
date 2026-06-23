const express = require("express");
const mongoose = require("mongoose");
const { version } = require("../package.json");

const router = express.Router();

router.get("/", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;

  const payload = {
    status: dbReady ? "ok" : "degraded",
    service: "bluepeak-api",
    version,
    db: dbReady ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  res.status(dbReady ? 200 : 503).json(payload);
});

module.exports = router;
