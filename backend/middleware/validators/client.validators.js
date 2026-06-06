const { body, param, validationResult } = require("express-validator");
const { CLIENT_STATUSES } = require("../../models/Client");
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

const createClientValidators = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Valid email required"),
  body("status").optional().isIn(CLIENT_STATUSES).withMessage("Invalid status"),
  validate,
];

const updateClientValidators = [
  mongoIdParam,
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional({ values: "falsy" }).isEmail().withMessage("Valid email required"),
  body("status").optional().isIn(CLIENT_STATUSES).withMessage("Invalid status"),
  validate,
];

const activityValidators = [
  mongoIdParam,
  body("type").isIn(ACTIVITY_TYPES).withMessage("Invalid activity type"),
  body("title").optional().trim(),
  body("body").optional().trim(),
  body("occurredAt").optional().isISO8601().withMessage("Invalid date"),
  body("dueDate").optional().isISO8601().withMessage("Invalid due date"),
  validate,
];

module.exports = {
  createClientValidators,
  updateClientValidators,
  activityValidators,
  mongoIdParam: [mongoIdParam, validate],
};
