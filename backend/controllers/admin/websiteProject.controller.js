const WebsiteProject = require("../../models/WebsiteProject");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uniqueSlug } = require("../../utils/slugify");
const { toSafeRegex } = require("../../utils/escapeRegex");

const notDeleted = { deletedAt: null };

const parseTags = (value) => {
  if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const parseCaseStudy = (value) => {
  if (value == null || value === "" || value === "null") return null;
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;

  const overview = String(raw.overview || "").trim();
  const problem = String(raw.problem || "").trim();
  const solution = String(raw.solution || "").trim();
  const highlights = Array.isArray(raw.highlights)
    ? raw.highlights.map((h) => String(h).trim()).filter(Boolean)
    : typeof raw.highlights === "string"
      ? raw.highlights
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean)
      : [];

  if (!overview && !problem && !solution && highlights.length === 0) return null;

  return { overview, problem, solution, highlights };
};

const buildFilter = (query) => {
  const filter = { ...notDeleted };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const pattern = toSafeRegex(query.search);
    if (pattern) {
      filter.$or = [{ title: pattern }, { desc: pattern }, { slug: pattern }, { category: pattern }];
    }
  }
  return filter;
};

const getProjects = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  const [items, total] = await Promise.all([
    WebsiteProject.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    WebsiteProject.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getProject = asyncHandler(async (req, res) => {
  const item = await WebsiteProject.findOne({ _id: req.params.id, ...notDeleted });
  if (!item) throw new ApiError(404, "Website project not found");
  res.json({ success: true, data: item });
});

const createProject = asyncHandler(async (req, res) => {
  const title = req.body.title?.trim();
  if (!title) throw new ApiError(400, "Title is required");

  const category = req.body.category?.trim();
  const desc = req.body.desc?.trim();
  const img = req.body.img?.trim();
  if (!category || !desc || !img) {
    throw new ApiError(400, "Category, description, and image URL are required");
  }

  const slug = await uniqueSlug(WebsiteProject, req.body.slug?.trim() || title, null, {
    softDelete: false,
  });

  try {
    const item = await WebsiteProject.create({
      slug,
      title,
      category,
      desc,
      tags: parseTags(req.body.tags),
      color: req.body.color?.trim() || "#378ADD",
      img,
      link: req.body.link?.trim() || "",
      caseStudy: parseCaseStudy(req.body.caseStudy),
      sortOrder: parseInt(req.body.sortOrder, 10) || 0,
      status: req.body.status || "Draft",
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(400, "A project with this slug already exists. Change the slug and try again.");
    }
    throw err;
  }
});

const updateProject = asyncHandler(async (req, res) => {
  const item = await WebsiteProject.findOne({ _id: req.params.id, ...notDeleted });
  if (!item) throw new ApiError(404, "Website project not found");

  if (req.body.title !== undefined) item.title = req.body.title.trim();
  if (req.body.category !== undefined) item.category = req.body.category.trim();
  if (req.body.desc !== undefined) item.desc = req.body.desc.trim();
  if (req.body.img !== undefined) item.img = req.body.img.trim();
  if (req.body.link !== undefined) item.link = req.body.link.trim();
  if (req.body.color !== undefined) item.color = req.body.color.trim() || "#378ADD";
  if (req.body.tags !== undefined) item.tags = parseTags(req.body.tags);
  if (req.body.sortOrder !== undefined) item.sortOrder = parseInt(req.body.sortOrder, 10) || 0;
  if (req.body.status !== undefined) item.status = req.body.status;
  if (req.body.caseStudy !== undefined) item.caseStudy = parseCaseStudy(req.body.caseStudy);

  if (req.body.slug !== undefined || req.body.title !== undefined) {
    const base = req.body.slug?.trim() || item.title;
    item.slug = await uniqueSlug(WebsiteProject, base, item._id, { softDelete: false });
  }

  try {
    await item.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(400, "A project with this slug already exists. Change the slug and try again.");
    }
    throw err;
  }
  res.json({ success: true, data: item });
});

const deleteProject = asyncHandler(async (req, res) => {
  const item = await WebsiteProject.findOne({ _id: req.params.id, ...notDeleted });
  if (!item) throw new ApiError(404, "Website project not found");
  // Free the slug so a new project can reuse the same title/slug
  item.slug = `${item.slug}-deleted-${Date.now()}`;
  item.deletedAt = new Date();
  await item.save();
  res.json({ success: true, message: "Website project deleted" });
});

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};
