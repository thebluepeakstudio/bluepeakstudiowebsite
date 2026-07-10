const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");
const {
  getServices,
  getService,
  getServiceSummary,
  createService,
  updateService,
  deleteService,
  uploadServiceFiles,
  getServiceDeliverables,
  postServiceDeliverable,
  putServiceDeliverable,
  deleteServiceDeliverable,
  postAssignment,
  putAssignment,
  deleteAssignment,
  getServicePayments,
  postServicePayment,
  putServicePayment,
  deleteServicePayment,
  getServiceInvoice,
  getServiceExpenses,
} = require("../../controllers/admin/service.controller");
const {
  createServiceValidators,
  createDeliverableValidators,
  updateDeliverableValidators,
  createAssignmentValidators,
  updateAssignmentValidators,
  createPaymentValidators,
  updatePaymentValidators,
  serviceIdParam,
  deliverableIdParam,
  assignmentIdParam,
  paymentIdParam,
} = require("../../middleware/validators/deliverable.validators");
const {
  patchRecurringConfigValidators,
  templateDeliverableValidators,
  templateIdParam,
  cycleIdParam,
  deliverableIdParam: cycleDeliverableIdParam,
  dueIdParam,
} = require("../../middleware/validators/recurring.validators");
const {
  getRecurringConfigHandler,
  patchRecurringConfigHandler,
  postTemplateDeliverable,
  putTemplateDeliverable,
  deleteTemplateDeliverableHandler,
  getBillingCycles,
  getWallet,
  getRecurringDetail,
  patchCycleDeliverable,
  postPayFreelancerDue,
  getCycleInvoice,
} = require("../../controllers/admin/recurring.controller");

const router = express.Router();
router.use(protect);

router.get("/summary", getServiceSummary);
router.get("/", getServices);
router.post("/", createServiceValidators, createService);
router.get("/:id", serviceIdParam, getService);
router.put("/:id", serviceIdParam, updateService);
router.delete("/:id", serviceIdParam, deleteService);
router.post("/:id/files", serviceIdParam, upload.array("files", 10), uploadServiceFiles);

router.get("/:id/deliverables", serviceIdParam, getServiceDeliverables);
router.post("/:id/deliverables", createDeliverableValidators, postServiceDeliverable);
router.put("/:id/deliverables/:deliverableId", updateDeliverableValidators, putServiceDeliverable);
router.delete("/:id/deliverables/:deliverableId", deliverableIdParam, deleteServiceDeliverable);

router.post(
  "/:id/deliverables/:deliverableId/assignments",
  createAssignmentValidators,
  postAssignment
);
router.put(
  "/:id/deliverables/:deliverableId/assignments/:assignmentId",
  updateAssignmentValidators,
  putAssignment
);
router.delete(
  "/:id/deliverables/:deliverableId/assignments/:assignmentId",
  assignmentIdParam,
  deleteAssignment
);

router.get("/:id/invoice", serviceIdParam, getServiceInvoice);

router.get("/:id/payments", serviceIdParam, getServicePayments);
router.post("/:id/payments", createPaymentValidators, postServicePayment);
router.put("/:id/payments/:paymentId", updatePaymentValidators, putServicePayment);
router.delete("/:id/payments/:paymentId", paymentIdParam, deleteServicePayment);

router.get("/:id/expenses", serviceIdParam, getServiceExpenses);

router.get("/:id/recurring-config", serviceIdParam, getRecurringConfigHandler);
router.patch("/:id/recurring-config", patchRecurringConfigValidators, patchRecurringConfigHandler);
router.get("/:id/recurring-detail", serviceIdParam, getRecurringDetail);
router.get("/:id/billing-cycles", serviceIdParam, getBillingCycles);
router.get("/:id/wallet", serviceIdParam, getWallet);
router.post("/:id/template-deliverables", templateDeliverableValidators, postTemplateDeliverable);
router.put(
  "/:id/template-deliverables/:templateId",
  [...templateDeliverableValidators, ...templateIdParam],
  putTemplateDeliverable
);
router.delete(
  "/:id/template-deliverables/:templateId",
  [...serviceIdParam, ...templateIdParam],
  deleteTemplateDeliverableHandler
);
router.patch(
  "/:id/billing-cycles/:cycleId/deliverables/:deliverableId",
  [...serviceIdParam, ...cycleIdParam, ...cycleDeliverableIdParam],
  patchCycleDeliverable
);
router.post(
  "/:id/billing-cycles/:cycleId/freelancer-dues/:dueId/pay",
  [...serviceIdParam, ...cycleIdParam, ...dueIdParam],
  postPayFreelancerDue
);
router.get(
  "/:id/billing-cycles/:cycleId/invoice",
  [...serviceIdParam, ...cycleIdParam],
  getCycleInvoice
);

module.exports = router;
