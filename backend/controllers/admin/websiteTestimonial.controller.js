const WebsiteTestimonial = require("../../models/WebsiteTestimonial");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { toSafeRegex } = require("../../utils/escapeRegex");

const notDeleted = { deletedAt: null };

const buildFilter = (query) => {
  const filter = { ...notDeleted };
  if (query.status) filter.status = query.status;
  if (query.search) {
    const pattern = toSafeRegex(query.search);
    if (pattern) {
      filter.$or = [{ name: pattern }, { text: pattern }];
    }
  }
  return filter;
};

const getTestimonials = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  const [items, total] = await Promise.all([
    WebsiteTestimonial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WebsiteTestimonial.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getTestimonial = asyncHandler(async (req, res) => {
  const item = await WebsiteTestimonial.findOne({ _id: req.params.id, ...notDeleted });
  if (!item) throw new ApiError(404, "Testimonial not found");
  res.json({ success: true, data: item });
});

const createTestimonial = asyncHandler(async (req, res) => {
  const status = req.body.status || "Draft";
  const img = req.body.img?.trim() || "";
  const payload = {
    name: req.body.name?.trim(),
    text: req.body.text?.trim(),
    img,
    rating: Math.min(5, Math.max(1, parseInt(req.body.rating, 10) || 5)),
    sortOrder: parseInt(req.body.sortOrder, 10) || 0,
    status,
    source: "crm",
  };

  if (!payload.name || !payload.text) {
    throw new ApiError(400, "Name and text are required");
  }
  if (status === "Published" && !img) {
    throw new ApiError(400, "Image URL is required before publishing");
  }

  const item = await WebsiteTestimonial.create(payload);
  res.status(201).json({ success: true, data: item });
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const item = await WebsiteTestimonial.findOne({ _id: req.params.id, ...notDeleted });
  if (!item) throw new ApiError(404, "Testimonial not found");

  if (req.body.name !== undefined) item.name = req.body.name.trim();
  if (req.body.text !== undefined) item.text = req.body.text.trim();
  if (req.body.img !== undefined) item.img = req.body.img.trim();
  if (req.body.rating !== undefined) {
    item.rating = Math.min(5, Math.max(1, parseInt(req.body.rating, 10) || 5));
  }
  if (req.body.sortOrder !== undefined) item.sortOrder = parseInt(req.body.sortOrder, 10) || 0;
  if (req.body.status !== undefined) item.status = req.body.status;

  if (item.status === "Published" && !item.img) {
    throw new ApiError(400, "Image URL is required before publishing");
  }

  await item.save();
  res.json({ success: true, data: item });
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const item = await WebsiteTestimonial.findOne({ _id: req.params.id, ...notDeleted });
  if (!item) throw new ApiError(404, "Testimonial not found");
  item.deletedAt = new Date();
  await item.save();
  res.json({ success: true, message: "Testimonial deleted" });
});

module.exports = {
  getTestimonials,
  getTestimonial,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
