const mongoose = require("mongoose");

const leadAttachmentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String },
    accessMode: { type: String, enum: ["authenticated", "public"], default: "authenticated" },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

leadAttachmentSchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model("LeadAttachment", leadAttachmentSchema);
