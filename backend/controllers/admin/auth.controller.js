const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Admin = require("../../models/Admin");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const loginValidators = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }

  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select("+password");

  if (!admin || !(await admin.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(admin._id);

  res.json({
    success: true,
    token,
    admin: { id: admin._id, name: admin.name, email: admin.email },
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
    },
  });
});

const getAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find().select("name email").sort({ name: 1 });
  res.json({
    success: true,
    data: admins.map((a) => ({ id: a._id, name: a.name, email: a.email })),
  });
});

module.exports = { login, getMe, getAdmins, loginValidators };
