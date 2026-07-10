const asyncHandler = require("../../utils/asyncHandler");
const { runDaily } = require("../../services/recurringBillingJob.service");
const { invalidateAnalyticsCache } = require("./analytics.controller");

const runBillingCycleJob = asyncHandler(async (req, res) => {
  const secret = process.env.BILLING_JOB_SECRET;
  if (secret && req.headers["x-billing-job-secret"] !== secret) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await runDaily();
  invalidateAnalyticsCache();
  res.json({ success: true, data: result });
});

module.exports = { runBillingCycleJob };
