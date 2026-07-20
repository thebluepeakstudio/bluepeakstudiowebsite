const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const {
  getTestimonials,
  getTestimonial,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require("../../controllers/admin/websiteTestimonial.controller");

const router = express.Router();
router.use(protect);

router.get("/", getTestimonials);
router.get("/:id", getTestimonial);
router.post("/", createTestimonial);
router.put("/:id", updateTestimonial);
router.delete("/:id", deleteTestimonial);

module.exports = router;
