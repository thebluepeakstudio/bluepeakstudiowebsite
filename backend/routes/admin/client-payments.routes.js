const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const {
  postClientPaymentPreview,
  postClientPayment,
  getClientPayments,
} = require("../../controllers/admin/clientPayment.controller");
const {
  createClientPaymentValidators,
  previewClientPaymentValidators,
} = require("../../middleware/validators/recurring.validators");
const { auditAction } = require("../../middleware/auditAction.middleware");
const { param } = require("express-validator");
const { validationResult } = require("express-validator");
const ApiError = require("../../utils/ApiError");

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, errors.array()[0].msg);
  next();
};

router.use(protect);

router.post("/preview", previewClientPaymentValidators, postClientPaymentPreview);
router.post(
  "/",
  createClientPaymentValidators,
  auditAction("client_payment.create", "client_payment", {
    getResourceId: (req) => req.body?.clientId,
  }),
  postClientPayment
);
router.get(
  "/client/:clientId",
  [param("clientId").isMongoId(), validate],
  getClientPayments
);

module.exports = router;
