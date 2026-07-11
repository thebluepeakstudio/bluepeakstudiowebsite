const express = require("express");
const router = express.Router();

const { createTestimonial } = require("../controllers/testimonialForm.controller");
const { publicFormRateLimit } = require("../middleware/rateLimit.middleware");

router.post("/", publicFormRateLimit, createTestimonial);

module.exports = router;