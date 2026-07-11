const mongoose = require("mongoose");

const DOCUMENT_CATEGORIES = [
  "Onboarding Documents",
  "Contracts",
  "Payment Plans",
  "Invoices",
  "Brand Assets",
  "Offboarding Documents",
  "Deliverables",
  "Other Attachments",
];

const documentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String },
    format: { type: String },
    resourceType: { type: String, enum: ["image", "raw", "video", "auto"], default: "image" },
    accessMode: { type: String, enum: ["authenticated", "public"], default: "authenticated" },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

documentSchema.index({ projectId: 1, category: 1 });

module.exports = mongoose.model("Document", documentSchema);
module.exports.DOCUMENT_CATEGORIES = DOCUMENT_CATEGORIES;
