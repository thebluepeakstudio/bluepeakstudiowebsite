const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../../controllers/admin/websiteProject.controller");

const router = express.Router();
router.use(protect);

router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

module.exports = router;
