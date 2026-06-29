const { body, param, validationResult } = require("express-validator");
const {
  SERVICE_CATEGORIES,
  DELIVERABLE_STATUSES,
  PAID_VIA,
} = require("../../constants/serviceCategories");
const ApiError = require("../../utils/ApiError");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }
  next();
};

const projectIdParam = param("id").isMongoId().withMessage("Invalid project ID");
const deliverableIdParam = param("deliverableId").isMongoId().withMessage("Invalid deliverable ID");
const assignmentIdParam = param("assignmentId").isMongoId().withMessage("Invalid assignment ID");
const paymentIdParam = param("paymentId").isMongoId().withMessage("Invalid payment ID");

const deliverableBody = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("category").isIn(SERVICE_CATEGORIES).withMessage("Invalid category"),
  body("description").optional().trim(),
  body("sellingPrice").optional().isFloat({ min: 0 }).withMessage("Invalid amount"),
  body("status").optional().isIn(DELIVERABLE_STATUSES).withMessage("Invalid status"),
];

const updateDeliverableValidators = [
  projectIdParam,
  deliverableIdParam,
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("category").optional().isIn(SERVICE_CATEGORIES).withMessage("Invalid category"),
  body("description").optional().trim(),
  body("sellingPrice").optional().isFloat({ min: 0 }).withMessage("Invalid amount"),
  body("status").optional().isIn(DELIVERABLE_STATUSES).withMessage("Invalid status"),
  validate,
];

const createDeliverableValidators = [projectIdParam, ...deliverableBody, validate];

const assignmentBody = [
  body("freelancerId").isMongoId().withMessage("Invalid freelancer ID"),
  body("role").optional().trim(),
  body("cost").optional().isFloat({ min: 0 }).withMessage("Invalid cost"),
  body("remarks").optional().trim(),
];

const createAssignmentValidators = [
  projectIdParam,
  deliverableIdParam,
  ...assignmentBody,
  validate,
];

const updateAssignmentValidators = [
  projectIdParam,
  deliverableIdParam,
  assignmentIdParam,
  body("role").optional().trim(),
  body("cost").optional().isFloat({ min: 0 }).withMessage("Invalid cost"),
  body("remarks").optional().trim(),
  validate,
];

const createPaymentValidators = [
  projectIdParam,
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("paymentDate").optional().isISO8601().withMessage("Invalid payment date"),
  body("method").optional().isIn(PAID_VIA).withMessage("Invalid payment method"),
  body("reference").optional().trim(),
  body("notes").optional().trim(),
  validate,
];

const updatePaymentValidators = [
  projectIdParam,
  paymentIdParam,
  body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  body("paymentDate").optional().isISO8601().withMessage("Invalid payment date"),
  body("method").optional().isIn(PAID_VIA).withMessage("Invalid payment method"),
  body("reference").optional().trim(),
  body("notes").optional().trim(),
  validate,
];

const createProjectValidators = [
  body("project.clientId").isMongoId().withMessage("Client is required"),
  body("project.projectTitle").trim().notEmpty().withMessage("Project name is required"),
  body("deliverables").isArray({ min: 1 }).withMessage("At least one deliverable is required"),
  body("deliverables.*.title").trim().notEmpty().withMessage("Deliverable title is required"),
  body("deliverables.*.category").isIn(SERVICE_CATEGORIES).withMessage("Invalid deliverable category"),
  body("deliverables.*.sellingPrice").optional().isFloat({ min: 0 }),
  validate,
];

module.exports = {
  createDeliverableValidators,
  updateDeliverableValidators,
  createAssignmentValidators,
  updateAssignmentValidators,
  createPaymentValidators,
  updatePaymentValidators,
  createProjectValidators,
  projectIdParam: [projectIdParam, validate],
  deliverableIdParam: [projectIdParam, deliverableIdParam, validate],
  assignmentIdParam: [projectIdParam, deliverableIdParam, assignmentIdParam, validate],
  paymentIdParam: [projectIdParam, paymentIdParam, validate],
};
