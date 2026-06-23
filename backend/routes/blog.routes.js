const express = require("express");
const {
  getPublishedBlogs,
  getFeaturedBlogs,
  getLatestBlogs,
  getBlogBySlug,
  getPublicCategories,
} = require("../controllers/blog.controller");

const router = express.Router();

router.get("/categories", getPublicCategories);
router.get("/featured", getFeaturedBlogs);
router.get("/latest", getLatestBlogs);
router.get("/", getPublishedBlogs);
router.get("/:slug", getBlogBySlug);

module.exports = router;
