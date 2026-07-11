const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Admin = require("../../models/Admin");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { setAuthCookie, clearAuthCookie } = require("../../utils/authCookie");
const { JWT_ALGORITHMS, getJwtExpiresIn } = require("../../utils/jwtConfig");

const signToken = (admin) => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "Server misconfigured: JWT_SECRET is not set");
  }
  return jwt.sign(
    { id: admin._id, tv: admin.tokenVersion || 0 },
    process.env.JWT_SECRET,
    {
      expiresIn: getJwtExpiresIn(),
      algorithm: JWT_ALGORITHMS[0],
    }
  );
};

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
  const admin = await Admin.findOne({ email }).select("+password tokenVersion");

  if (!admin || !(await admin.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signToken(admin);
  setAuthCookie(res, token);

  res.json({
    success: true,
    admin: { id: admin._id, name: admin.name, email: admin.email },
    // Bearer fallback for cross-origin CRM (cookie may not persist across domains)
    token,
  });
});

const logout = asyncHandler(async (req, res) => {
  await Admin.findByIdAndUpdate(req.admin._id, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out" });
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

module.exports = { login, logout, getMe, getAdmins, loginValidators };
