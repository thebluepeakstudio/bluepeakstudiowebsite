const mongoose = require("mongoose");

const ACTIVITY_TYPES = ["call", "meeting", "email", "note", "task"];

const clientActivitySchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    occurredAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
    createdBy: { type: String, required: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    sourceLeadActivityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadActivity",
    },
  },
  { timestamps: true }
);

clientActivitySchema.index({ clientId: 1, occurredAt: -1 });

module.exports = mongoose.model("ClientActivity", clientActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
