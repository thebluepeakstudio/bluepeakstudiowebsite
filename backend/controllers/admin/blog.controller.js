const Blog = require("../../models/Blog");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const { slugify, uniqueSlug } = require("../../utils/slugify");
const { readingTime } = require("../../utils/readingTime");

const BLOG_FOLDER = "bluepeak/blog";
const notDeleted = { deletedAt: null };

const parseJSONArray = (value, fallback = []) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseTags = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const BLOG_IMAGE_OPTS = {
  transformation: [{ width: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
};

const uploadImage = async (file) => {
  const result = await uploadToCloudinary(file.buffer, BLOG_FOLDER, BLOG_IMAGE_OPTS);
  return { url: result.secure_url, publicId: result.public_id };
};

const buildFilter = (query) => {
  const filter = { ...notDeleted };
  if (query.status) filter.status = query.status;
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { excerpt: { $regex: query.search, $options: "i" } },
      { slug: { $regex: query.search, $options: "i" } },
    ];
  }
  return filter;
};

const resolvePublishedAt = (status, publishedAt, existing) => {
  if (status !== "Published") return null;
  if (publishedAt) {
    const parsed = new Date(publishedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return existing || new Date();
};

const getBlogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Blog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: blogs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ _id: req.params.id, ...notDeleted }).populate(
    "categoryId",
    "name slug"
  );
  if (!blog) throw new ApiError(404, "Blog not found");
  res.json({ success: true, data: blog });
});

const createBlog = asyncHandler(async (req, res) => {
  const title = req.body.title.trim();
  const baseSlug = req.body.slug?.trim() || title;
  const slug = await uniqueSlug(Blog, baseSlug);
  const status = req.body.status || "Draft";
  const content = req.body.content || "";

  const payload = {
    title,
    slug,
    excerpt: req.body.excerpt || "",
    content,
    categoryId: req.body.categoryId || null,
    author: req.body.author?.trim() || "BluePeak Studio",
    seoTitle: req.body.seoTitle || "",
    seoDescription: req.body.seoDescription || "",
    seoKeywords: req.body.seoKeywords || "",
    tags: parseTags(req.body.tags),
    status,
    isFeatured: req.body.isFeatured === true || req.body.isFeatured === "true",
    readingTime: readingTime(content),
    publishedAt: resolvePublishedAt(status, req.body.publishedAt, null),
  };

  if (req.files?.featuredImage?.[0]) {
    const img = await uploadImage(req.files.featuredImage[0]);
    payload.featuredImage = img;
  }

  if (req.files?.galleryImages?.length) {
    payload.galleryImages = await Promise.all(req.files.galleryImages.map(uploadImage));
  }

  const blog = await Blog.create(payload);
  const populated = await Blog.findById(blog._id).populate("categoryId", "name slug");
  res.status(201).json({ success: true, data: populated });
});

const updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ _id: req.params.id, ...notDeleted });
  if (!blog) throw new ApiError(404, "Blog not found");

  if (req.body.title !== undefined) blog.title = req.body.title.trim();
  if (req.body.excerpt !== undefined) blog.excerpt = req.body.excerpt;
  if (req.body.content !== undefined) {
    blog.content = req.body.content;
    blog.readingTime = readingTime(req.body.content);
  }
  if (req.body.categoryId !== undefined) blog.categoryId = req.body.categoryId || null;
  if (req.body.author !== undefined) blog.author = req.body.author.trim();
  if (req.body.seoTitle !== undefined) blog.seoTitle = req.body.seoTitle;
  if (req.body.seoDescription !== undefined) blog.seoDescription = req.body.seoDescription;
  if (req.body.seoKeywords !== undefined) blog.seoKeywords = req.body.seoKeywords;
  if (req.body.tags !== undefined) blog.tags = parseTags(req.body.tags);
  if (req.body.isFeatured !== undefined) {
    blog.isFeatured = req.body.isFeatured === true || req.body.isFeatured === "true";
  }

  if (req.body.slug !== undefined) {
    blog.slug = await uniqueSlug(Blog, req.body.slug, blog._id);
  } else if (req.body.title !== undefined) {
    blog.slug = await uniqueSlug(Blog, slugify(req.body.title), blog._id);
  }

  if (req.body.status !== undefined) {
    blog.status = req.body.status;
    blog.publishedAt = resolvePublishedAt(
      req.body.status,
      req.body.publishedAt,
      blog.publishedAt
    );
  } else if (req.body.publishedAt !== undefined) {
    blog.publishedAt = req.body.publishedAt ? new Date(req.body.publishedAt) : null;
  }

  const keptGallery = parseJSONArray(req.body.keptGalleryImages, null);
  if (keptGallery !== null) {
    const removed = blog.galleryImages.filter(
      (img) => !keptGallery.some((k) => k.publicId === img.publicId)
    );
    await Promise.all(removed.map((img) => deleteFromCloudinary(img.publicId)));
    blog.galleryImages = keptGallery.map((img) => ({
      url: img.url,
      publicId: img.publicId,
      alt: img.alt || "",
    }));
  }

  if (req.body.removeFeatured === "true" || req.body.removeFeatured === true) {
    if (blog.featuredImage?.publicId) {
      await deleteFromCloudinary(blog.featuredImage.publicId);
    }
    blog.featuredImage = { url: "", publicId: "" };
  }

  if (req.files?.featuredImage?.[0]) {
    if (blog.featuredImage?.publicId) {
      await deleteFromCloudinary(blog.featuredImage.publicId);
    }
    blog.featuredImage = await uploadImage(req.files.featuredImage[0]);
  }

  if (req.files?.galleryImages?.length) {
    const uploaded = await Promise.all(req.files.galleryImages.map(uploadImage));
    blog.galleryImages.push(...uploaded);
  }

  if (blog.status === "Published" && !blog.publishedAt) {
    blog.publishedAt = new Date();
  }

  await blog.save();
  const populated = await Blog.findById(blog._id).populate("categoryId", "name slug");
  res.json({ success: true, data: populated });
});

const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ _id: req.params.id, ...notDeleted });
  if (!blog) throw new ApiError(404, "Blog not found");

  blog.deletedAt = new Date();
  await blog.save();

  res.json({ success: true, message: "Blog deleted" });
});

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
};
