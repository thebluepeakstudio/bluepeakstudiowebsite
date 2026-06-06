const mongoose = require("mongoose");
const { ACTIVITY_TYPES } = require("./ClientActivity");

const leadActivitySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
    createdBy: { type: String, required: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

leadActivitySchema.index({ leadId: 1, occurredAt: -1 });

module.exports = mongoose.model("LeadActivity", leadActivitySchema);
