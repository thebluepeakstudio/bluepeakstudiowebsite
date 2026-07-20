const WebsiteTestimonial = require("../models/WebsiteTestimonial");
const WebsiteProject = require("../models/WebsiteProject");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { publishedWebsiteFilter } = require("../utils/publishedWebsiteFilter");

const getPublishedTestimonials = asyncHandler(async (req, res) => {
  const items = await WebsiteTestimonial.find(publishedWebsiteFilter())
    .select("name text img rating sortOrder")
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  res.json({ success: true, data: items });
});

const getPublishedProjects = asyncHandler(async (req, res) => {
  const items = await WebsiteProject.find(publishedWebsiteFilter())
    .select("slug title category desc tags color img link size caseStudy sortOrder")
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  const categories = [...new Set(items.map((p) => p.category).filter(Boolean))];

  res.json({
    success: true,
    data: items,
    filters: ["All", ...categories],
  });
});

const getPublishedProjectBySlug = asyncHandler(async (req, res) => {
  const item = await WebsiteProject.findOne({
    slug: req.params.slug,
    ...publishedWebsiteFilter(),
  }).lean();

  if (!item) throw new ApiError(404, "Project not found");
  res.json({ success: true, data: item });
});

module.exports = {
  getPublishedTestimonials,
  getPublishedProjects,
  getPublishedProjectBySlug,
};
