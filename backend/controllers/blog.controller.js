const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { publishedBlogFilter } = require("../utils/publishedBlogFilter");
const { toSafeRegex } = require("../utils/escapeRegex");

const publishedFilter = publishedBlogFilter();

const buildPublicFilter = (query) => {
  const filter = { ...publishedFilter };
  if (query.category) {
    filter["categoryId.slug"] = query.category;
  }
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.search) {
    const pattern = toSafeRegex(query.search);
    if (pattern) {
      filter.$or = [{ title: pattern }, { excerpt: pattern }];
    }
  }
  if (query.featured === "true") filter.isFeatured = true;
  return filter;
};

const getPublishedBlogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 9);
  const skip = (page - 1) * limit;

  let filter = { ...publishedFilter };
  if (req.query.category) {
    const cat = await BlogCategory.findOne({ slug: req.query.category }).select("_id");
    if (cat) filter.categoryId = cat._id;
    else filter.categoryId = null;
  }
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.search) {
    const pattern = toSafeRegex(req.query.search);
    if (pattern) {
      filter.$or = [{ title: pattern }, { excerpt: pattern }];
    }
  }

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .populate("categoryId", "name slug")
      .select(
        "title slug excerpt featuredImage categoryId author readingTime publishedAt isFeatured tags"
      )
      .sort({ publishedAt: -1 })
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

const getFeaturedBlogs = asyncHandler(async (req, res) => {
  const limit = Math.min(10, parseInt(req.query.limit, 10) || 3);
  const blogs = await Blog.find({ ...publishedFilter, isFeatured: true })
    .populate("categoryId", "name slug")
    .select(
      "title slug excerpt featuredImage categoryId author readingTime publishedAt isFeatured tags"
    )
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: blogs });
});

const getLatestBlogs = asyncHandler(async (req, res) => {
  const limit = Math.min(10, parseInt(req.query.limit, 10) || 6);
  const blogs = await Blog.find(publishedFilter)
    .populate("categoryId", "name slug")
    .select(
      "title slug excerpt featuredImage categoryId author readingTime publishedAt isFeatured tags"
    )
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: blogs });
});

const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({
    slug: req.params.slug,
    ...publishedFilter,
  }).populate("categoryId", "name slug description");

  if (!blog) throw new ApiError(404, "Blog not found");

  const blogId = blog._id;
  const categoryId = blog.categoryId?._id || blog.categoryId;
  const tags = blog.tags || [];
  const selectFields =
    "title slug excerpt featuredImage categoryId author readingTime publishedAt tags";
  const excludeSelf = { _id: { $ne: blogId } };

  const [prev, next, sameCategory, tagMatches, latestPosts, categoryCounts] = await Promise.all([
    Blog.findOne({
      ...publishedFilter,
      ...excludeSelf,
      publishedAt: { $lt: blog.publishedAt },
    })
      .sort({ publishedAt: -1 })
      .select("title slug")
      .lean(),
    Blog.findOne({
      ...publishedFilter,
      ...excludeSelf,
      publishedAt: { $gt: blog.publishedAt },
    })
      .sort({ publishedAt: 1 })
      .select("title slug")
      .lean(),
    categoryId
      ? Blog.find({ ...publishedFilter, ...excludeSelf, categoryId })
          .populate("categoryId", "name slug")
          .select(selectFields)
          .sort({ publishedAt: -1 })
          .limit(5)
          .lean()
      : [],
    tags.length
      ? Blog.find({
          ...publishedFilter,
          ...excludeSelf,
          tags: { $in: tags },
        })
          .populate("categoryId", "name slug")
          .select(selectFields)
          .sort({ publishedAt: -1 })
          .limit(5)
          .lean()
      : [],
    Blog.find({ ...publishedFilter, ...excludeSelf })
      .populate("categoryId", "name slug")
      .select(selectFields)
      .sort({ publishedAt: -1 })
      .limit(8)
      .lean(),
    BlogCategory.aggregate([
      {
        $lookup: {
          from: "blogs",
          let: { catId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$categoryId", "$$catId"] },
                status: "Published",
                deletedAt: null,
              },
            },
            { $count: "count" },
          ],
          as: "postStats",
        },
      },
      {
        $addFields: {
          count: {
            $ifNull: [{ $arrayElemAt: ["$postStats.count", 0] }, 0],
          },
        },
      },
      { $match: { count: { $gt: 0 } } },
      { $project: { name: 1, slug: 1, count: 1 } },
      { $sort: { name: 1 } },
    ]),
  ]);

  const recommended = [];
  const seen = new Set([String(blogId)]);

  const addPosts = (posts) => {
    for (const post of posts) {
      if (recommended.length >= 6) return;
      const id = String(post._id);
      if (seen.has(id)) continue;
      seen.add(id);
      recommended.push(post);
    }
  };

  addPosts(sameCategory);
  addPosts(tagMatches);
  addPosts(latestPosts);

  res.json({
    success: true,
    data: {
      blog,
      navigation: { prev, next },
      related: recommended,
      recommended,
      categories: categoryCounts,
    },
  });
});

const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await BlogCategory.find().sort({ name: 1 }).lean();
  res.json({ success: true, data: categories });
});

module.exports = {
  getPublishedBlogs,
  getFeaturedBlogs,
  getLatestBlogs,
  getBlogBySlug,
  getPublicCategories,
};
