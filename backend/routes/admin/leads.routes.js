const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");
const {
  createLeadValidators,
  updateLeadValidators,
  statusValidators,
  activityValidators,
  bulkValidators,
  followUpValidators,
  mongoIdParam,
} = require("../../middleware/validators/lead.validators");
const {
  getLeads,
  getKanban,
  getLeadMetrics,
  getFollowUps,
  getLead,
  getLeadOverview,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  bulkAction,
  getLeadActivities,
  logLeadActivity,
  getLeadStatusHistory,
  getLeadAttachments,
  uploadLeadAttachments,
  deleteLeadAttachment,
  updateFollowUp,
  convertLead,
} = require("../../controllers/admin/lead.controller");

const router = express.Router();
router.use(protect);

router.get("/metrics", getLeadMetrics);
router.get("/follow-ups", getFollowUps);
router.get("/kanban", getKanban);
router.post("/bulk", bulkValidators, bulkAction);
router.get("/", getLeads);
router.post("/", createLeadValidators, createLead);
router.get("/:id/activities", mongoIdParam, getLeadActivities);
router.post("/:id/activities", activityValidators, logLeadActivity);
router.get("/:id/status-history", mongoIdParam, getLeadStatusHistory);
router.get("/:id/attachments", mongoIdParam, getLeadAttachments);
router.post("/:id/attachments", mongoIdParam, upload.array("files", 10), uploadLeadAttachments);
router.delete("/:id/attachments/:attachmentId", mongoIdParam, deleteLeadAttachment);
router.patch("/:id/follow-up", followUpValidators, updateFollowUp);
router.patch("/:id/status", statusValidators, updateLeadStatus);
router.post("/:id/convert", mongoIdParam, convertLead);
router.get("/:id/overview", mongoIdParam, getLeadOverview);
router.get("/:id", mongoIdParam, getLead);
router.put("/:id", updateLeadValidators, updateLead);
router.delete("/:id", mongoIdParam, deleteLead);

module.exports = router;
