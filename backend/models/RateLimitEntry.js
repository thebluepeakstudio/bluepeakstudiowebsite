const mongoose = require("mongoose");

const rateLimitEntrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 1 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

rateLimitEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RateLimitEntry", rateLimitEntrySchema);
