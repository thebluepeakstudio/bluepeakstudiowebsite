const BlogCategory = require("../../models/BlogCategory");
const Blog = require("../../models/Blog");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { slugify, uniqueSlug } = require("../../utils/slugify");

const getCategories = asyncHandler(async (req, res) => {
  const categories = await BlogCategory.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: categories });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await BlogCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  res.json({ success: true, data: category });
});

const createCategory = asyncHandler(async (req, res) => {
  const name = req.body.name.trim();
  const baseSlug = req.body.slug?.trim() || name;
  const slug = await uniqueSlug(BlogCategory, baseSlug, null, { softDelete: false });

  const category = await BlogCategory.create({
    name,
    slug,
    description: req.body.description || "",
  });

  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await BlogCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  if (req.body.name !== undefined) category.name = req.body.name.trim();
  if (req.body.description !== undefined) category.description = req.body.description;

  if (req.body.slug !== undefined) {
    category.slug = await uniqueSlug(BlogCategory, req.body.slug, category._id, {
      softDelete: false,
    });
  } else if (req.body.name !== undefined) {
    category.slug = await uniqueSlug(BlogCategory, slugify(req.body.name), category._id, {
      softDelete: false,
    });
  }

  await category.save();
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await BlogCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  const inUse = await Blog.countDocuments({ categoryId: category._id, deletedAt: null });
  if (inUse > 0) {
    throw new ApiError(400, "Cannot delete category that has blogs assigned");
  }

  await BlogCategory.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Category deleted" });
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
