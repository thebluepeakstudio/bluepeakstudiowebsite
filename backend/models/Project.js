const mongoose = require("mongoose");

const PROJECT_TYPES = [
  "Website",
  "Graphic Design",
  "SMM",
  "SEO",
  "Branding",
  "Video Editing",
];
const PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];
const WORK_STATUSES = [
  "Not Started",
  "In Progress",
  "Waiting for Client",
  "Revision",
  "Completed",
  "Delivered",
];
const FREELANCER_PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];

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
    projectType: { type: String, enum: PROJECT_TYPES, required: true },
    projectTitle: { type: String, trim: true },
    projectDescription: { type: String, trim: true },
    dateOfOnboarding: { type: Date },
    expectedCompletionDate: { type: Date },
    actualCompletionDate: { type: Date },
    totalAmount: { type: Number, default: 0, min: 0 },
    advanceReceived: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0, min: 0 },
    advancePaymentDate: { type: Date },
    fullPaymentDate: { type: Date },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Pending" },
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
  if (this.paymentStatus === "Paid") {
    this.remainingAmount = 0;
    if (this.totalAmount > 0) {
      this.advanceReceived = this.totalAmount;
    }
    return;
  }
  const total = this.totalAmount || 0;
  const advance = this.advanceReceived || 0;
  this.remainingAmount = Math.max(0, total - advance);
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
