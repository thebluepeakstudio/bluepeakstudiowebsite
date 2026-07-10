const mongoose = require("mongoose");
const { BILLING_CYCLE_PHASES } = require("../constants/serviceCategories");

const billingCycleSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    periodMonth: { type: Date, required: true },
    billingDate: { type: Date, required: true },
    generatedAt: { type: Date, default: Date.now },
    clientAmountSnapshot: { type: Number, default: 0, min: 0 },
    freelancerCostSnapshot: { type: Number, default: 0, min: 0 },
    phase: {
      type: String,
      enum: BILLING_CYCLE_PHASES,
      default: "upcoming",
      index: true,
    },
  },
  { timestamps: true }
);

billingCycleSchema.index({ serviceId: 1, periodMonth: 1 }, { unique: true });

module.exports = mongoose.model("BillingCycle", billingCycleSchema);
