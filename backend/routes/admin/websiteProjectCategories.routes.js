const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../../controllers/admin/websiteProjectCategory.controller");

const router = express.Router();
router.use(protect);

router.get("/", getCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
