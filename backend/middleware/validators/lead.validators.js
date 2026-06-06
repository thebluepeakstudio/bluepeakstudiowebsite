const { body, param, validationResult } = require("express-validator");
const {
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  LEAD_REQUIREMENTS,
  FOLLOW_UP_STATUSES,
} = require("../../models/Lead");
const { ACTIVITY_TYPES } = require("../../models/ClientActivity");
const ApiError = require("../../utils/ApiError");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }
  next();
};

const mongoIdParam = param("id").isMongoId().withMessage("Invalid ID");

const createLeadValidators = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Valid email required"),
  body("status").optional().isIn(LEAD_STAGES).withMessage("Invalid status"),
  body("leadSource").optional().isIn(LEAD_SOURCES).withMessage("Invalid lead source"),
  body("priority").optional().isIn(LEAD_PRIORITIES).withMessage("Invalid priority"),
  body("estimatedProjectValue").optional().isFloat({ min: 0 }).withMessage("Invalid value"),
  body("requirements").optional().isArray().withMessage("Requirements must be an array"),
  body("requirements.*").optional().isIn(LEAD_REQUIREMENTS).withMessage("Invalid requirement"),
  validate,
];

const updateLeadValidators = [
  mongoIdParam,
  body("fullName").optional().trim().notEmpty().withMessage("Full name cannot be empty"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Valid email required"),
  body("status").optional().isIn(LEAD_STAGES).withMessage("Invalid status"),
  body("leadSource").optional().isIn(LEAD_SOURCES),
  body("priority").optional().isIn(LEAD_PRIORITIES),
  body("estimatedProjectValue").optional().isFloat({ min: 0 }),
  body("requirements").optional().isArray(),
  body("requirements.*").optional().isIn(LEAD_REQUIREMENTS),
  validate,
];

const statusValidators = [
  mongoIdParam,
  body("status").isIn(LEAD_STAGES).withMessage("Invalid status"),
  body("note").optional().trim(),
  validate,
];

const activityValidators = [
  mongoIdParam,
  body("type").isIn(ACTIVITY_TYPES).withMessage("Invalid activity type"),
  validate,
];

const bulkValidators = [
  body("action")
    .isIn(["delete", "updateStatus", "assign", "addTags", "setPriority"])
    .withMessage("Invalid bulk action"),
  body("ids").isArray({ min: 1 }).withMessage("Select at least one lead"),
  body("ids.*").isMongoId(),
  validate,
];

const followUpValidators = [
  mongoIdParam,
  body("followUpStatus").optional().isIn(FOLLOW_UP_STATUSES),
  validate,
];

module.exports = {
  createLeadValidators,
  updateLeadValidators,
  statusValidators,
  activityValidators,
  bulkValidators,
  followUpValidators,
  mongoIdParam: [mongoIdParam, validate],
};
