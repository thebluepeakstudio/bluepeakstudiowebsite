const mongoose = require("mongoose");
const {
  SERVICE_CATEGORIES,
  PAYMENT_STATUSES,
  WORK_STATUSES,
  FREELANCER_PAYMENT_STATUSES,
  BILLING_MODELS,
} = require("../constants/serviceCategories");

const attachmentSchema = new mongoose.Schema(
  {
    fileName: String,
    fileUrl: String,
    publicId: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const assignedFreelancerSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
    },
    outsourcingCost: { type: Number, default: 0, min: 0 },
    amountPaidToFreelancer: { type: Number, default: 0, min: 0 },
    freelancerPaymentStatus: {
      type: String,
      enum: FREELANCER_PAYMENT_STATUSES,
      default: "Pending",
    },
  },
  { _id: true }
);

const serviceSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", index: true },
    legacyProjectId: { type: mongoose.Schema.Types.ObjectId, default: null },
    clientName: { type: String, trim: true },
    businessName: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    category: { type: String, enum: SERVICE_CATEGORIES },
    billingModel: { type: String, enum: BILLING_MODELS, default: "one_time" },
    name: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    description: { type: String, trim: true },
    dateOfOnboarding: { type: Date },
    expectedCompletionDate: { type: Date },
    actualCompletionDate: { type: Date },
    totalPrice: { type: Number, default: 0, min: 0 },
    advanceReceived: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0, min: 0 },
    advancePaymentDate: { type: Date },
    fullPaymentDate: { type: Date },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Unpaid" },
    isOutsourced: { type: Boolean, default: false },
    assignedFreelancers: [assignedFreelancerSchema],
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" },
    freelancerAssigned: { type: String, trim: true },
    outsourcingCost: { type: Number, default: 0, min: 0 },
    amountPaidToFreelancer: { type: Number, default: 0, min: 0 },
    freelancerPaymentStatus: {
      type: String,
      enum: FREELANCER_PAYMENT_STATUSES,
      default: "Pending",
    },
    workStatus: { type: String, enum: WORK_STATUSES, default: "Not Started" },
    notes: { type: String, trim: true },
    googleDriveLink: { type: String, trim: true },
    attachments: [attachmentSchema],
    templateId: { type: mongoose.Schema.Types.ObjectId, default: null },
    contractId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

serviceSchema.pre("save", function () {
  const total = Number(this.totalPrice) || 0;
  const advance = Number(this.advanceReceived) || 0;

  if (this.paymentStatus === "Paid") {
    this.remainingAmount = 0;
    if (total > 0) this.advanceReceived = total;
    return;
  }

  this.remainingAmount = Math.max(0, Math.round((total - advance) * 100) / 100);
  if (total > 0 && this.remainingAmount === 0) this.paymentStatus = "Paid";
});

serviceSchema.index({ billingModel: 1, paymentStatus: 1, category: 1 });
serviceSchema.index({ workStatus: 1, paymentStatus: 1 });
serviceSchema.index({ dateOfOnboarding: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ name: "text", clientName: "text", businessName: "text" });

module.exports = mongoose.model("Service", serviceSchema);
