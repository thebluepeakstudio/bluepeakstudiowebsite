const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");
const {
  getProjects,
  getProject,
  getProjectSummary,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectFiles,
  getProjectDeliverables,
  postProjectDeliverable,
  putProjectDeliverable,
  deleteProjectDeliverable,
  postAssignment,
  putAssignment,
  deleteAssignment,
  getProjectPayments,
  postProjectPayment,
  deleteProjectPayment,
  getProjectExpenses,
} = require("../../controllers/admin/project.controller");
const {
  createProjectValidators,
  createDeliverableValidators,
  updateDeliverableValidators,
  createAssignmentValidators,
  updateAssignmentValidators,
  createPaymentValidators,
  projectIdParam,
  deliverableIdParam,
  assignmentIdParam,
  paymentIdParam,
} = require("../../middleware/validators/deliverable.validators");

const router = express.Router();
router.use(protect);

router.get("/summary", getProjectSummary);
router.get("/", getProjects);
router.post("/", createProjectValidators, createProject);
router.get("/:id", projectIdParam, getProject);
router.put("/:id", projectIdParam, updateProject);
router.delete("/:id", projectIdParam, deleteProject);
router.post("/:id/files", projectIdParam, upload.array("files", 10), uploadProjectFiles);

router.get("/:id/deliverables", projectIdParam, getProjectDeliverables);
router.post("/:id/deliverables", createDeliverableValidators, postProjectDeliverable);
router.put("/:id/deliverables/:deliverableId", updateDeliverableValidators, putProjectDeliverable);
router.delete("/:id/deliverables/:deliverableId", deliverableIdParam, deleteProjectDeliverable);

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

router.get("/:id/payments", projectIdParam, getProjectPayments);
router.post("/:id/payments", createPaymentValidators, postProjectPayment);
router.delete("/:id/payments/:paymentId", paymentIdParam, deleteProjectPayment);

router.get("/:id/expenses", projectIdParam, getProjectExpenses);

module.exports = router;
