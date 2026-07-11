const express = require("express");
const { login, logout, getMe, getAdmins, loginValidators } = require("../../controllers/admin/auth.controller");
const { protect } = require("../../middleware/auth.middleware");
const { loginRateLimit } = require("../../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/login", loginRateLimit, loginValidators, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.get("/admins", protect, getAdmins);

module.exports = router;
