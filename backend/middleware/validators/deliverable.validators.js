const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");
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

const projectIdParam = param("id").isMongoId().withMessage("Invalid service ID");
const serviceIdParam = projectIdParam;
const deliverableIdParam = param("deliverableId").isMongoId().withMessage("Invalid deliverable ID");
const assignmentIdParam = param("assignmentId").isMongoId().withMessage("Invalid assignment ID");
const paymentIdParam = param("paymentId").isMongoId().withMessage("Invalid payment ID");

const deliverableBody = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("category").isIn(SERVICE_CATEGORIES).withMessage("Invalid category"),
  body("description").optional().trim(),
  body("sellingPrice").optional({ values: "null" }).isFloat({ min: 0 }).withMessage("Invalid amount").toFloat(),
  body("status").optional().isIn(DELIVERABLE_STATUSES).withMessage("Invalid status"),
];

const updateDeliverableValidators = [
  projectIdParam,
  deliverableIdParam,
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("category").optional().isIn(SERVICE_CATEGORIES).withMessage("Invalid category"),
  body("description").optional().trim(),
  body("sellingPrice").optional({ values: "null" }).isFloat({ min: 0 }).withMessage("Invalid amount").toFloat(),
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
  body("deliverables.*.sellingPrice").optional({ values: "null" }).isFloat({ min: 0 }).toFloat(),
  validate,
];

const requireServiceContainer = body().custom((_, { req }) => {
  const container = req.body?.service || req.body?.project;
  if (!container?.clientId) throw new Error("Client is required");
  if (!mongoose.Types.ObjectId.isValid(String(container.clientId))) {
    throw new Error("Client is required");
  }
  const name = container?.name || container?.projectTitle || container?.category;
  if (!name?.trim()) throw new Error("Service name is required");
  return true;
});

const createServiceValidators = [
  requireServiceContainer,
  body("service.clientId").optional().isMongoId(),
  body("project.clientId").optional().isMongoId(),
  body("deliverables").isArray({ min: 1 }).withMessage("At least one deliverable is required"),
  body("deliverables.*.title").trim().notEmpty().withMessage("Deliverable title is required"),
  body("deliverables.*.category").isIn(SERVICE_CATEGORIES).withMessage("Invalid deliverable category"),
  body("deliverables.*.sellingPrice").optional({ values: "null" }).isFloat({ min: 0 }).toFloat(),
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
  createServiceValidators,
  projectIdParam: [projectIdParam, validate],
  serviceIdParam: [serviceIdParam, validate],
  deliverableIdParam: [projectIdParam, deliverableIdParam, validate],
  assignmentIdParam: [projectIdParam, deliverableIdParam, assignmentIdParam, validate],
  paymentIdParam: [projectIdParam, paymentIdParam, validate],
};
