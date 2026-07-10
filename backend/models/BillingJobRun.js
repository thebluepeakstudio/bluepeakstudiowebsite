const mongoose = require("mongoose");

const billingJobRunSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    status: { type: String, enum: ["running", "success", "failed"], default: "running" },
    cyclesGenerated: { type: Number, default: 0 },
    cyclesDueFlipped: { type: Number, default: 0 },
    creditsApplied: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingJobRun", billingJobRunSchema);
