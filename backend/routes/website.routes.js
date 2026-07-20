const express = require("express");
const {
  getPublishedTestimonials,
  getPublishedProjects,
  getPublishedProjectBySlug,
} = require("../controllers/website.controller");

const router = express.Router();

router.get("/testimonials", getPublishedTestimonials);
router.get("/projects", getPublishedProjects);
router.get("/projects/:slug", getPublishedProjectBySlug);

module.exports = router;
