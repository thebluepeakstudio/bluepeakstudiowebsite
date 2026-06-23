const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: "" },
  },
  { _id: true }
);

const BLOG_STATUSES = ["Draft", "Published"];

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, trim: true, default: "" },
    content: { type: String, default: "" },
    featuredImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    galleryImages: [imageSchema],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "BlogCategory", default: null },
    author: { type: String, trim: true, default: "BluePeak Studio" },
    seoTitle: { type: String, trim: true, default: "" },
    seoDescription: { type: String, trim: true, default: "" },
    seoKeywords: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: BLOG_STATUSES, default: "Draft" },
    isFeatured: { type: Boolean, default: false },
    readingTime: { type: Number, default: 1, min: 1 },
    publishedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ categoryId: 1, status: 1 });
blogSchema.index({ isFeatured: 1, status: 1, publishedAt: -1 });
blogSchema.index({ deletedAt: 1 });
blogSchema.index({ title: "text", excerpt: "text", content: "text" });

module.exports = mongoose.model("Blog", blogSchema);
module.exports.BLOG_STATUSES = BLOG_STATUSES;
