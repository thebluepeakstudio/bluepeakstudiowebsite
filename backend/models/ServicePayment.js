const mongoose = require("mongoose");
const { PAID_VIA } = require("../constants/serviceCategories");

const servicePaymentSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
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

servicePaymentSchema.index({ serviceId: 1, paymentDate: -1 });

module.exports = mongoose.model("ServicePayment", servicePaymentSchema);
