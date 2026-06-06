const express = require("express");
const { login, getMe, getAdmins, loginValidators } = require("../../controllers/admin/auth.controller");
const { protect } = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/login", loginValidators, login);
router.get("/me", protect, getMe);
router.get("/admins", protect, getAdmins);

module.exports = router;
