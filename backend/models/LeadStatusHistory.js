const mongoose = require("mongoose");
const { LEAD_STAGES } = require("./Lead");

const leadStatusHistorySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    fromStatus: { type: String, enum: [...LEAD_STAGES, null] },
    toStatus: { type: String, enum: LEAD_STAGES, required: true },
    changedBy: { type: String, required: true },
    changedById: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

leadStatusHistorySchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model("LeadStatusHistory", leadStatusHistorySchema);
