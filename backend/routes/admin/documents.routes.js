const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const upload = require("../../middleware/upload.middleware");
const {
  getDocuments,
  uploadDocuments,
  viewDocument,
  deleteDocument,
} = require("../../controllers/admin/document.controller");

const router = express.Router();
router.use(protect);

router.get("/projects/:projectId/documents", getDocuments);
router.get("/documents/:id/view", viewDocument);
router.post(
  "/projects/:projectId/documents",
  upload.array("files", 10),
  uploadDocuments
);
router.delete("/:id", deleteDocument);

module.exports = router;
