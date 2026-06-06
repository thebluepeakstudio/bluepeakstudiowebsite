const express = require("express");
const authRoutes = require("./auth.routes");
const projectRoutes = require("./projects.routes");
const documentRoutes = require("./documents.routes");
const expenseRoutes = require("./expenses.routes");
const freelancerRoutes = require("./freelancers.routes");
const analyticsRoutes = require("./analytics.routes");
const contactRoutes = require("./contacts.routes");
const clientRoutes = require("./clients.routes");
const leadRoutes = require("./leads.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/", documentRoutes);
router.use("/expenses", expenseRoutes);
router.use("/freelancers", freelancerRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/contacts", contactRoutes);
router.use("/clients", clientRoutes);
router.use("/leads", leadRoutes);

module.exports = router;
