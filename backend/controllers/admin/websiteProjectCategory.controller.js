const WebsiteProjectCategory = require("../../models/WebsiteProjectCategory");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { slugify } = require("../../utils/slugify");

const getCategories = asyncHandler(async (req, res) => {
  const categories = await WebsiteProjectCategory.find({}).sort({ name: 1 }).lean();
  res.json({ success: true, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) throw new ApiError(400, "Category name is required");

  const slug = slugify(req.body.slug || name) || "category";

  const existing = await WebsiteProjectCategory.findOne({
    $or: [
      { slug },
      { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    ],
  }).lean();
  if (existing) throw new ApiError(400, "Category already exists");

  const category = await WebsiteProjectCategory.create({ name, slug });

  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await WebsiteProjectCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");

  if (req.body.name !== undefined) {
    const name = req.body.name.trim();
    if (!name) throw new ApiError(400, "Category name is required");
    category.name = name;
    category.slug = slugify(req.body.slug || name) || category.slug;
  }

  await category.save();
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await WebsiteProjectCategory.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  res.json({ success: true, message: "Category deleted" });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
