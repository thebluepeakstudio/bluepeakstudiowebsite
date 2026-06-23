const { body, param, query } = require("express-validator");
const { BLOG_STATUSES } = require("../../models/Blog");
const ApiError = require("../../utils/ApiError");

const validate = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }
  next();
};

const mongoIdParam = [param("id").isMongoId().withMessage("Invalid ID"), validate];

const parseTags = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const blogBodyValidators = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("slug").optional().trim().isLength({ max: 200 }),
  body("excerpt").optional().trim().isLength({ max: 500 }),
  body("content").optional().isString(),
  body("categoryId").optional({ values: "null" }).isMongoId().withMessage("Invalid category"),
  body("author").optional().trim().isLength({ max: 120 }),
  body("seoTitle").optional().trim().isLength({ max: 160 }),
  body("seoDescription").optional().trim().isLength({ max: 320 }),
  body("seoKeywords").optional().trim().isLength({ max: 255 }),
  body("status").optional().isIn(BLOG_STATUSES),
  body("isFeatured").optional().isBoolean().toBoolean(),
  body("publishedAt")
    .optional({ checkFalsy: true, values: "null" })
    .custom((value) => {
      if (!value) return true;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid publish date");
      return true;
    }),
  body("tags").optional().customSanitizer(parseTags),
];

const createBlogValidators = [...blogBodyValidators, validate];
const updateBlogValidators = [...mongoIdParam.slice(0, 1), ...blogBodyValidators, validate];

const listBlogQuery = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("status").optional().isIn(BLOG_STATUSES),
  query("categoryId").optional().isMongoId(),
  query("search").optional().trim(),
  validate,
];

module.exports = {
  validate,
  mongoIdParam,
  createBlogValidators,
  updateBlogValidators,
  listBlogQuery,
};
