const mongoose = require("mongoose");
const {
  SERVICE_CATEGORIES,
  PAYMENT_STATUSES,
  WORK_STATUSES,
  FREELANCER_PAYMENT_STATUSES,
} = require("../constants/serviceCategories");

const PROJECT_TYPES = SERVICE_CATEGORIES;

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

const projectSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    projectType: { type: String, enum: PROJECT_TYPES },
    projectTitle: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    projectDescription: { type: String, trim: true },
    dateOfOnboarding: { type: Date },
    expectedCompletionDate: { type: Date },
    actualCompletionDate: { type: Date },
    totalAmount: { type: Number, default: 0, min: 0 },
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
  },
  { timestamps: true }
);

projectSchema.pre("save", function () {
  const total = Number(this.totalAmount) || 0;
  const advance = Number(this.advanceReceived) || 0;

  if (this.paymentStatus === "Paid") {
    this.remainingAmount = 0;
    if (total > 0) {
      this.advanceReceived = total;
    }
    return;
  }

  this.remainingAmount = Math.max(0, Math.round((total - advance) * 100) / 100);

  if (total > 0 && this.remainingAmount === 0) {
    this.paymentStatus = "Paid";
  }
});

projectSchema.index({ clientId: 1 });
projectSchema.index({ workStatus: 1, paymentStatus: 1, projectType: 1 });
projectSchema.index({ dateOfOnboarding: 1 });
projectSchema.index({ "assignedFreelancers.freelancerId": 1, isOutsourced: 1 });
projectSchema.index({ freelancerId: 1, isOutsourced: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ paymentStatus: 1 });
projectSchema.index({ clientName: "text", projectTitle: "text", businessName: "text" });

module.exports = mongoose.model("Project", projectSchema);
module.exports.PROJECT_TYPES = PROJECT_TYPES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.WORK_STATUSES = WORK_STATUSES;
