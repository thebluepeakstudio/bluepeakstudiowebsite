const express = require("express");
const blogUpload = require("../../middleware/blogUpload.middleware");
const { protect } = require("../../middleware/auth.middleware");
const {
  createBlogValidators,
  updateBlogValidators,
  listBlogQuery,
  mongoIdParam,
} = require("../../middleware/validators/blog.validators");
const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../../controllers/admin/blog.controller");

const router = express.Router();
router.use(protect);

const uploadFields = blogUpload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "galleryImages", maxCount: 10 },
]);

router.get("/", listBlogQuery, getBlogs);
router.get("/:id", mongoIdParam, getBlog);
router.post("/", uploadFields, createBlogValidators, createBlog);
router.put("/:id", uploadFields, updateBlogValidators, updateBlog);
router.delete("/:id", mongoIdParam, deleteBlog);

module.exports = router;
