const mongoose = require("mongoose");
const { slugify } = require("../utils/slugify");

const blogCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

blogCategorySchema.pre("validate", function setSlug() {
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name) || "category";
  }
});

blogCategorySchema.index({ name: "text" });

module.exports = mongoose.model("BlogCategory", blogCategorySchema);
