const mongoose = require("mongoose");

const WEBSITE_STATUSES = ["Draft", "Published"];

const caseStudySchema = new mongoose.Schema(
  {
    overview: { type: String, trim: true, default: "" },
    problem: { type: String, trim: true, default: "" },
    solution: { type: String, trim: true, default: "" },
    highlights: [{ type: String, trim: true }],
  },
  { _id: false }
);

const websiteProjectSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    color: { type: String, trim: true, default: "#378ADD" },
    img: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: "" },
    caseStudy: { type: caseStudySchema, default: null },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: WEBSITE_STATUSES, default: "Draft" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

websiteProjectSchema.index({ status: 1, sortOrder: 1 });
websiteProjectSchema.index({ deletedAt: 1 });
websiteProjectSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model("WebsiteProject", websiteProjectSchema);
module.exports.WEBSITE_STATUSES = WEBSITE_STATUSES;
