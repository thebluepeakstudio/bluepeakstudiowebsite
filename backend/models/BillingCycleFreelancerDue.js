const mongoose = require("mongoose");
const { CYCLE_FREELANCER_DUE_STATUSES } = require("../constants/serviceCategories");

const billingCycleFreelancerDueSchema = new mongoose.Schema(
  {
    billingCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingCycle",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      default: null,
      index: true,
    },
    amountDue: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: CYCLE_FREELANCER_DUE_STATUSES,
      default: "upcoming",
      index: true,
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

billingCycleFreelancerDueSchema.index({ billingCycleId: 1 }, { unique: true });

module.exports = mongoose.model("BillingCycleFreelancerDue", billingCycleFreelancerDueSchema);
