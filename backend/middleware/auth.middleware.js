const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const Admin = require("../models/Admin");
const { readAuthToken } = require("../utils/authCookie");
const { JWT_ALGORITHMS } = require("../utils/jwtConfig");

const protect = async (req, res, next) => {
  try {
    const token = readAuthToken(req);

    if (!token) {
      throw new ApiError(401, "Not authorized — no token");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: JWT_ALGORITHMS,
    });
    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      throw new ApiError(401, "Admin not found");
    }

    const tokenVersion = decoded.tv ?? 0;
    if ((admin.tokenVersion || 0) !== tokenVersion) {
      throw new ApiError(401, "Invalid or expired token");
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    next(err);
  }
};

module.exports = { protect };
