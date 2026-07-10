const mongoose = require("mongoose");
const {
  SERVICE_CATEGORIES,
  DELIVERABLE_STATUSES,
} = require("../constants/serviceCategories");

const billingCycleDeliverableSchema = new mongoose.Schema(
  {
    billingCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingCycle",
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    templateDeliverableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringDeliverableTemplate",
      default: null,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: DELIVERABLE_STATUSES,
      default: "Not Started",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      default: null,
    },
    freelancerFee: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

billingCycleDeliverableSchema.index({ billingCycleId: 1, sortOrder: 1 });

module.exports = mongoose.model("BillingCycleDeliverable", billingCycleDeliverableSchema);
