// routes/contactForm.routes.js

const express = require("express");
const router = express.Router();

const { createContactForm } = require("../controllers/contactForm.controller");
const { publicFormRateLimit } = require("../middleware/rateLimit.middleware");

router.post("/", publicFormRateLimit, createContactForm);

module.exports = router;