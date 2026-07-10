const mongoose = require("mongoose");
const { SERVICE_CATEGORIES } = require("../constants/serviceCategories");

const recurringDeliverableTemplateSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: SERVICE_CATEGORIES },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

recurringDeliverableTemplateSchema.index({ serviceId: 1, sortOrder: 1 });

module.exports = mongoose.model(
  "RecurringDeliverableTemplate",
  recurringDeliverableTemplateSchema
);
