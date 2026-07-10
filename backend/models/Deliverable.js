const mongoose = require("mongoose");
const {
  SERVICE_CATEGORIES,
  DELIVERABLE_STATUSES,
  DELIVERABLE_PRIORITIES,
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

const commentSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true },
    author: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const deliverableSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: SERVICE_CATEGORIES },
    description: { type: String, trim: true },
    sellingPrice: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    actualCompletion: { type: Date },
    status: {
      type: String,
      enum: DELIVERABLE_STATUSES,
      default: "Not Started",
    },
    priority: {
      type: String,
      enum: DELIVERABLE_PRIORITIES,
      default: "Medium",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    attachments: [attachmentSchema],
    comments: [commentSchema],
    parentDeliverableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deliverable",
      default: null,
    },
    estimatedHours: { type: Number, default: null, min: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deliverableSchema.index({ serviceId: 1, deletedAt: 1 });
deliverableSchema.index({ category: 1, deletedAt: 1 });
deliverableSchema.index({ status: 1 });

module.exports = mongoose.model("Deliverable", deliverableSchema);
module.exports.DELIVERABLE_STATUSES = DELIVERABLE_STATUSES;
