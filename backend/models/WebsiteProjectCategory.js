const mongoose = require("mongoose");
const { slugify } = require("../utils/slugify");

const websiteProjectCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

websiteProjectCategorySchema.pre("validate", function setSlug(next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name);
  }
  next();
});

module.exports = mongoose.model("WebsiteProjectCategory", websiteProjectCategorySchema);
