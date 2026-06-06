const mongoose = require("mongoose");

const PAID_VIA = ["UPI", "Bank", "Cash", "Card"];

const freelancerPaymentSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paidVia: { type: String, enum: PAID_VIA, default: "UPI" },
    notes: { type: String, trim: true },
    recordedBy: { type: String, required: true },
  },
  { timestamps: true }
);

freelancerPaymentSchema.index({ freelancerId: 1, paymentDate: -1 });
freelancerPaymentSchema.index({ projectId: 1, paymentDate: -1 });

module.exports = mongoose.model("FreelancerPayment", freelancerPaymentSchema);
module.exports.PAID_VIA = PAID_VIA;
