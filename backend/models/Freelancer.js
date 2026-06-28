const mongoose = require("mongoose");
const { SERVICE_CATEGORIES } = require("../constants/serviceCategories");

const AVAILABILITY = ["Available", "Busy", "Unavailable"];

const freelancerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    skills: [{ type: String, enum: SERVICE_CATEGORIES }],
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    pricing: { type: String, trim: true },
    availabilityStatus: { type: String, enum: AVAILABILITY, default: "Available" },
    totalProjectsAssigned: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

freelancerSchema.index({ name: "text", email: "text" });

module.exports = mongoose.model("Freelancer", freelancerSchema);
module.exports.AVAILABILITY = AVAILABILITY;
module.exports.SKILL_OPTIONS = SERVICE_CATEGORIES;
