const mongoose = require("mongoose");

const clientAttachmentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String },
    accessMode: { type: String, enum: ["authenticated", "public"], default: "authenticated" },
    uploadedBy: { type: String, required: true },
    sourceLeadAttachmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadAttachment",
    },
  },
  { timestamps: true }
);

clientAttachmentSchema.index({ clientId: 1, createdAt: -1 });

module.exports = mongoose.model("ClientAttachment", clientAttachmentSchema);
