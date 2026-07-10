const mongoose = require("mongoose");
const { PAID_VIA } = require("../constants/serviceCategories");

const clientPaymentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
      index: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    method: { type: String, enum: PAID_VIA, default: "UPI" },
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientPayment", clientPaymentSchema);
