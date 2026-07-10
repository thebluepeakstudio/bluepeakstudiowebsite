const mongoose = require("mongoose");
const { PAYMENT_ALLOCATION_TARGETS } = require("../constants/serviceCategories");

const paymentAllocationSchema = new mongoose.Schema(
  {
    clientPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientPayment",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: PAYMENT_ALLOCATION_TARGETS,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentAllocation", paymentAllocationSchema);
