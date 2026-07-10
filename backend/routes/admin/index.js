const express = require("express");
const authRoutes = require("./auth.routes");
const projectRoutes = require("./projects.routes");
const serviceRoutes = require("./services.routes");
const clientPaymentRoutes = require("./client-payments.routes");
const jobRoutes = require("./jobs.routes");
const brandRoutes = require("./brands.routes");
const documentRoutes = require("./documents.routes");
const expenseRoutes = require("./expenses.routes");
const freelancerRoutes = require("./freelancers.routes");
const analyticsRoutes = require("./analytics.routes");
const contactRoutes = require("./contacts.routes");
const clientRoutes = require("./clients.routes");
const leadRoutes = require("./leads.routes");
const blogRoutes = require("./blogs.routes");
const blogCategoryRoutes = require("./blogCategories.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/services", serviceRoutes);
router.use("/client-payments", clientPaymentRoutes);
router.use("/jobs", jobRoutes);
router.use("/brands", brandRoutes);
router.use("/", documentRoutes);
router.use("/expenses", expenseRoutes);
router.use("/freelancers", freelancerRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/contacts", contactRoutes);
router.use("/clients", clientRoutes);
router.use("/leads", leadRoutes);
router.use("/blogs", blogRoutes);
router.use("/blog-categories", blogCategoryRoutes);

module.exports = router;
