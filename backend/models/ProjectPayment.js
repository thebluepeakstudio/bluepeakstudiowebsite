const mongoose = require("mongoose");
const { PROJECT_PAYMENT_TYPES, PAID_VIA } = require("../constants/serviceCategories");

const projectPaymentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: PROJECT_PAYMENT_TYPES,
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    method: { type: String, enum: PAID_VIA, default: "UPI" },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedBy: { type: String, required: true },
  },
  { timestamps: true }
);

projectPaymentSchema.index({ projectId: 1, paymentDate: -1 });

module.exports = mongoose.model("ProjectPayment", projectPaymentSchema);
module.exports.PROJECT_PAYMENT_TYPES = PROJECT_PAYMENT_TYPES;
