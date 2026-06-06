const mongoose = require("mongoose");

const CLIENT_STATUSES = ["Active", "Inactive"];

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: CLIENT_STATUSES, default: "Active" },
    tags: [{ type: String, trim: true }],
    sourceLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
  },
  { timestamps: true }
);

clientSchema.index({ name: "text", companyName: "text", email: "text" });
clientSchema.index({ status: 1, createdAt: -1 });
clientSchema.index({ sourceLeadId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Client", clientSchema);
module.exports.CLIENT_STATUSES = CLIENT_STATUSES;
