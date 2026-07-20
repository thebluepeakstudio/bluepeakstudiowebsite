const mongoose = require("mongoose");

const WEBSITE_STATUSES = ["Draft", "Published"];

const websiteTestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    img: { type: String, trim: true, default: "" },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: WEBSITE_STATUSES, default: "Draft" },
    source: { type: String, enum: ["crm", "form"], default: "crm" },
    formSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestimonialForm",
      default: null,
      index: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

websiteTestimonialSchema.index({ status: 1, sortOrder: 1 });
websiteTestimonialSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("WebsiteTestimonial", websiteTestimonialSchema);
module.exports.WEBSITE_STATUSES = WEBSITE_STATUSES;
