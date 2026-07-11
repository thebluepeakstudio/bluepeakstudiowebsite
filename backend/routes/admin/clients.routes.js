const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");
const {
  createClientValidators,
  updateClientValidators,
  activityValidators,
  mongoIdParam,
} = require("../../middleware/validators/client.validators");
const {
  getClients,
  getClient,
  getClientOverview,
  getClientProjects,
  getClientActivities,
  getClientAttachments,
  getClientTestimonials,
  createClient,
  updateClient,
  deleteClient,
  logClientActivity,
  uploadClientAttachments,
  deleteClientAttachment,
} = require("../../controllers/admin/client.controller");
const { viewClientAttachment } = require("../../controllers/admin/attachmentView.controller");
const { auditAction } = require("../../middleware/auditAction.middleware");

const router = express.Router();
router.use(protect);

router.get("/", getClients);
router.post("/", createClientValidators, createClient);
router.get("/:id/overview", mongoIdParam, getClientOverview);
router.get("/:id/projects", mongoIdParam, getClientProjects);
router.get("/:id/activities", mongoIdParam, getClientActivities);
router.post("/:id/activities", activityValidators, logClientActivity);
router.get("/:id/attachments", mongoIdParam, getClientAttachments);
router.get("/:id/testimonials", mongoIdParam, getClientTestimonials);
router.get("/:id/attachments/:attachmentId/view", mongoIdParam, viewClientAttachment);
router.post("/:id/attachments", mongoIdParam, upload.array("files", 10), uploadClientAttachments);
router.delete("/:id/attachments/:attachmentId", mongoIdParam, deleteClientAttachment);
router.get("/:id", mongoIdParam, getClient);
router.put("/:id", updateClientValidators, updateClient);
router.delete("/:id", mongoIdParam, auditAction("client.delete", "client"), deleteClient);

module.exports = router;
