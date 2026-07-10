const mongoose = require("mongoose");
const { FREELANCER_DUE_STATUSES } = require("../constants/serviceCategories");
const { roundMoney } = require("../utils/recurringDates");

const freelancerDueSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    billingCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingCycle",
      default: null,
      index: true,
    },
    billingMonth: { type: Date, default: null, index: true },
    deliverableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deliverable",
      default: null,
    },
    billingCycleDeliverableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingCycleDeliverable",
      default: null,
    },
    deliverableAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliverableAssignment",
      default: null,
    },
    legacyBillingCycleFreelancerDueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingCycleFreelancerDue",
      default: null,
    },
    deliverableTitle: { type: String, trim: true, default: "" },
    serviceTitle: { type: String, trim: true, default: "" },
    clientName: { type: String, trim: true, default: "" },
    brandName: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: FREELANCER_DUE_STATUSES,
      default: "pending",
      index: true,
    },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    paymentMethod: { type: String, trim: true, default: null },
    transactionReference: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

freelancerDueSchema.pre("save", function () {
  if (this.status === "cancelled") return;
  const amount = roundMoney(this.amount);
  let paid = roundMoney(this.amountPaid);
  if (paid > amount) paid = amount;
  this.amount = amount;
  this.amountPaid = paid;
  if (amount <= 0) {
    this.status = "cancelled";
    return;
  }
  if (paid <= 0) {
    this.status = "pending";
    this.paidAt = null;
  } else if (paid >= amount) {
    this.status = "paid";
    if (!this.paidAt) this.paidAt = new Date();
  } else {
    this.status = "partial";
    this.paidAt = null;
  }
});

freelancerDueSchema.index(
  { deliverableAssignmentId: 1 },
  { unique: true, partialFilterExpression: { deliverableAssignmentId: { $type: "objectId" } } }
);
freelancerDueSchema.index(
  { billingCycleDeliverableId: 1, freelancerId: 1 },
  {
    unique: true,
    partialFilterExpression: { billingCycleDeliverableId: { $type: "objectId" } },
  }
);
freelancerDueSchema.index({ freelancerId: 1, status: 1, createdAt: -1 });
freelancerDueSchema.index({ serviceId: 1, billingMonth: 1 });

module.exports = mongoose.model("FreelancerDue", freelancerDueSchema);
