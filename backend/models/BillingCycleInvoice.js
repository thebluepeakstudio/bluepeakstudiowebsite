const mongoose = require("mongoose");
const { CYCLE_INVOICE_STATUSES } = require("../constants/serviceCategories");

const billingCycleInvoiceSchema = new mongoose.Schema(
  {
    billingCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingCycle",
      required: true,
      unique: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    amountDue: { type: Number, default: 0, min: 0 },
    creditApplied: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: CYCLE_INVOICE_STATUSES,
      default: "upcoming",
      index: true,
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingCycleInvoice", billingCycleInvoiceSchema);
