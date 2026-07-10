const express = require("express");
const { runBillingCycleJob } = require("../../controllers/admin/jobs.controller");

const router = express.Router();

router.post("/billing-cycle", runBillingCycleJob);

module.exports = router;
