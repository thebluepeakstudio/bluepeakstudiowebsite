const { body, param } = require("express-validator");
const ApiError = require("../../utils/ApiError");

const validate = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }
  next();
};

const mongoIdParam = [param("id").isMongoId().withMessage("Invalid ID"), validate];

const createCategoryValidators = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("slug").optional().trim(),
  body("description").optional().trim().isLength({ max: 500 }),
  validate,
];

const updateCategoryValidators = [
  param("id").isMongoId(),
  body("name").optional().trim().notEmpty(),
  body("slug").optional().trim(),
  body("description").optional().trim().isLength({ max: 500 }),
  validate,
];

module.exports = {
  mongoIdParam,
  createCategoryValidators,
  updateCategoryValidators,
};
