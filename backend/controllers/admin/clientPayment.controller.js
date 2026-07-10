const asyncHandler = require("../../utils/asyncHandler");
const {
  createClientPaymentWithAllocations,
  listClientPayments,
  previewClientPayment,
} = require("../../services/clientPaymentAllocation.service");
const { invalidateAnalyticsCache } = require("./analytics.controller");

const postClientPaymentPreview = asyncHandler(async (req, res) => {
  const data = await previewClientPayment(req.body);
  res.json({ success: true, data });
});

const postClientPayment = asyncHandler(async (req, res) => {
  const data = await createClientPaymentWithAllocations(req.body, req.admin.name);
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data });
});

const getClientPayments = asyncHandler(async (req, res) => {
  const data = await listClientPayments(req.params.clientId);
  res.json({ success: true, data });
});

module.exports = {
  postClientPaymentPreview,
  postClientPayment,
  getClientPayments,
};
