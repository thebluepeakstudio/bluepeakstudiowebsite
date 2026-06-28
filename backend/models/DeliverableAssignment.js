const mongoose = require("mongoose");
const { FREELANCER_PAYMENT_STATUSES } = require("../constants/serviceCategories");
const { computeFreelancerPaymentStatus } = require("../utils/projectFreelancerPayment");

const deliverableAssignmentSchema = new mongoose.Schema(
  {
    deliverableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectDeliverable",
      required: true,
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
      index: true,
    },
    role: { type: String, trim: true, default: "General" },
    cost: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: FREELANCER_PAYMENT_STATUSES,
      default: "Pending",
    },
    remarks: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deliverableAssignmentSchema.pre("save", function () {
  const cost = Number(this.cost) || 0;
  let paid = Number(this.amountPaid) || 0;
  if (paid > cost) paid = cost;
  this.amountPaid = paid;
  this.paymentStatus = computeFreelancerPaymentStatus(cost, paid);
});

deliverableAssignmentSchema.index({ deliverableId: 1, deletedAt: 1 });
deliverableAssignmentSchema.index({ freelancerId: 1, deletedAt: 1 });

module.exports = mongoose.model("DeliverableAssignment", deliverableAssignmentSchema);
