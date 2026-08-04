const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const {
  RECURRING_STATUSES,
  BILLING_FREQUENCIES,
  PAYMENT_ALLOCATION_TARGETS,
} = require("../../constants/serviceCategories");
const ApiError = require("../../utils/ApiError");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }
  next();
};

const requireClientId = body().custom((_, { req }) => {
  const clientId = req.body?.service?.clientId || req.body?.project?.clientId;
  if (!clientId) throw new Error("Client is required");
  if (!mongoose.Types.ObjectId.isValid(String(clientId))) {
    throw new Error("Client is required");
  }
  return true;
});

const requireServiceName = body().custom((_, { req }) => {
  const container = req.body?.service || req.body?.project;
  const name = container?.name || container?.projectTitle || container?.category;
  if (!name?.trim()) throw new Error("Service name is required");
  return true;
});
const serviceIdParam = [param("id").isMongoId(), validate];
const projectIdParam = serviceIdParam;

const createRecurringServiceValidators = [
  requireClientId,
  requireServiceName,
  body("service.clientId").optional().isMongoId(),
  body("project.clientId").optional().isMongoId(),
  body("service.billingModel").optional().equals("recurring"),
  body("project.billingModel").optional().equals("recurring"),
  body("config.startDate").notEmpty(),
  body("config.billingDay").isInt({ min: 1, max: 28 }),
  body("config.billingFrequency").optional().isIn(BILLING_FREQUENCIES),
  body("config.monthlyClientAmount").isFloat({ min: 0 }),
  body("config.monthlyFreelancerCost").optional().isFloat({ min: 0 }),
  body("config.generationLeadDays").optional().isInt({ min: 3, max: 7 }),
  body("templateDeliverables").isArray({ min: 1 }),
  body("templateDeliverables.*.title").trim().notEmpty(),
  validate,
];

const patchRecurringConfigValidators = [
  param("id").isMongoId(),
  body("billingDay").optional().isInt({ min: 1, max: 28 }),
  body("billingFrequency").optional().isIn(BILLING_FREQUENCIES),
  body("monthlyClientAmount").optional().isFloat({ min: 0 }),
  body("monthlyFreelancerCost").optional().isFloat({ min: 0 }),
  body("generationLeadDays").optional().isInt({ min: 3, max: 7 }),
  body("status").optional().isIn(RECURRING_STATUSES),
  body("applyScope").optional().isIn(["future_only", "current_and_future"]),
  validate,
];

const templateDeliverableValidators = [
  param("id").isMongoId(),
  body("title").trim().notEmpty(),
  body("applyScope").optional().isIn(["future_only", "current_and_future"]),
  validate,
];

const deleteTemplateDeliverableValidators = [
  param("id").isMongoId(),
  param("templateId").isMongoId(),
  body("applyScope").optional().isIn(["future_only", "current_and_future"]),
  query("applyScope").optional().isIn(["future_only", "current_and_future"]),
  validate,
];

const templateIdParam = [param("templateId").isMongoId(), validate];
const cycleIdParam = [param("cycleId").isMongoId(), validate];
const deliverableIdParam = [param("deliverableId").isMongoId(), validate];
const dueIdParam = [param("dueId").isMongoId(), validate];

const createClientPaymentValidators = [
  body("clientId").isMongoId(),
  body("totalAmount").isFloat({ min: 0.01 }),
  body("serviceId").optional().isMongoId(),
  body("splits").optional().isArray({ min: 1 }),
  body("splits.*.serviceId").optional().isMongoId(),
  body("splits.*.amount").optional().isFloat({ min: 0.01 }),
  body("paymentDate").optional().isISO8601(),
  body("method").optional().isString(),
  body("notes").optional().isString(),
  body().custom((_, { req }) => {
    if (!req.body.serviceId && (!req.body.splits || !req.body.splits.length)) {
      throw new Error("Provide a service or payment splits");
    }
    return true;
  }),
  validate,
];

const previewClientPaymentValidators = [
  body("clientId").isMongoId(),
  body("totalAmount").isFloat({ min: 0.01 }),
  body("serviceId").optional().isMongoId(),
  body("splits").optional().isArray({ min: 1 }),
  body("splits.*.serviceId").optional().isMongoId(),
  body("splits.*.amount").optional().isFloat({ min: 0.01 }),
  body().custom((_, { req }) => {
    if (!req.body.serviceId && (!req.body.splits || !req.body.splits.length)) {
      throw new Error("Provide a service or payment splits");
    }
    return true;
  }),
  validate,
];

module.exports = {
  serviceIdParam,
  projectIdParam,
  createRecurringServiceValidators,
  createRecurringProjectValidators: createRecurringServiceValidators,
  patchRecurringConfigValidators,
  templateDeliverableValidators,
  deleteTemplateDeliverableValidators,
  templateIdParam,
  cycleIdParam,
  deliverableIdParam,
  dueIdParam,
  createClientPaymentValidators,
  previewClientPaymentValidators,
};
