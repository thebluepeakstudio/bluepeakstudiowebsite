const mongoose = require("mongoose");
const { SERVICE_CATEGORIES, DELIVERABLE_STATUSES } = require("../constants/serviceCategories");

const projectDeliverableSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    description: { type: String, trim: true },
    sellingPrice: { type: Number, default: 0, min: 0 },
    expectedCompletion: { type: Date },
    actualCompletion: { type: Date },
    status: {
      type: String,
      enum: DELIVERABLE_STATUSES,
      default: "Not Started",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

projectDeliverableSchema.index({ projectId: 1, deletedAt: 1 });
projectDeliverableSchema.index({ category: 1, deletedAt: 1 });
projectDeliverableSchema.index({ status: 1 });

module.exports = mongoose.model("ProjectDeliverable", projectDeliverableSchema);
module.exports.DELIVERABLE_STATUSES = DELIVERABLE_STATUSES;
