const mongoose = require("mongoose");
const {
  BILLING_FREQUENCIES,
  RECURRING_STATUSES,
} = require("../constants/serviceCategories");

const recurringServiceConfigSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      unique: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    billingFrequency: {
      type: String,
      enum: BILLING_FREQUENCIES,
      default: "monthly",
    },
    billingDay: { type: Number, min: 1, max: 28, required: true },
    monthlyClientAmount: { type: Number, default: 0, min: 0 },
    monthlyFreelancerCost: { type: Number, default: 0, min: 0 },
    generationLeadDays: { type: Number, default: 5, min: 3, max: 7 },
    status: {
      type: String,
      enum: RECURRING_STATUSES,
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecurringServiceConfig", recurringServiceConfigSchema);
