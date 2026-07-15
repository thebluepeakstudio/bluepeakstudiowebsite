const mongoose = require("mongoose");
const { BRAND_STATUSES } = require("../constants/serviceCategories");

const brandSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, trim: true, default: "" },
    logoPublicId: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: BRAND_STATUSES, default: "Active", index: true },
    notes: { type: String, trim: true, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

brandSchema.index({ clientId: 1, name: 1 });
brandSchema.index({ clientId: 1, status: 1 });

module.exports = mongoose.model("Brand", brandSchema);
