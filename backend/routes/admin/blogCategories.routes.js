const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const {
  createCategoryValidators,
  updateCategoryValidators,
  mongoIdParam,
} = require("../../middleware/validators/blogCategory.validators");
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../../controllers/admin/blogCategory.controller");

const router = express.Router();
router.use(protect);

router.get("/", getCategories);
router.post("/", createCategoryValidators, createCategory);
router.get("/:id", mongoIdParam, getCategory);
router.put("/:id", updateCategoryValidators, updateCategory);
router.delete("/:id", mongoIdParam, deleteCategory);

module.exports = router;
