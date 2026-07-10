const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const Service = require("../../models/Service");
const {
  getRecurringConfig,
  updateRecurringConfig,
  upsertTemplateDeliverable,
  deleteTemplateDeliverable,
  listBillingCycles,
  buildRecurringServiceDetail,
  updateCycleDeliverable,
  payFreelancerDue,
} = require("../../services/recurringService.service");
const { listWalletTransactions } = require("../../services/recurringWallet.service");
const { generateBillingCycleInvoicePdf } = require("../../services/billingCycleInvoice.service");
const { syncRecurringBillingForService } = require("../../services/recurringBillingJob.service");
const { invalidateAnalyticsCache } = require("./analytics.controller");

const ensureRecurringService = async (serviceId) => {
  const service = await Service.findById(serviceId).lean();
  if (!service) throw new ApiError(404, "Service not found");
  if (service.billingModel !== "recurring") {
    throw new ApiError(400, "Service is not recurring");
  }
  return service;
};

const getRecurringConfigHandler = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await getRecurringConfig(req.params.id);
  res.json({ success: true, data });
});

const patchRecurringConfigHandler = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await updateRecurringConfig(req.params.id, req.body);
  invalidateAnalyticsCache();
  res.json({ success: true, data });
});

const postTemplateDeliverable = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await upsertTemplateDeliverable(req.params.id, req.body);
  res.status(201).json({ success: true, data });
});

const putTemplateDeliverable = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await upsertTemplateDeliverable(req.params.id, req.body, req.params.templateId);
  res.json({ success: true, data });
});

const deleteTemplateDeliverableHandler = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const applyScope = req.body?.applyScope || req.query?.applyScope;
  await deleteTemplateDeliverable(req.params.id, req.params.templateId, applyScope);
  res.json({ success: true, message: "Template deliverable removed" });
});

const getBillingCycles = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await listBillingCycles(req.params.id);
  res.json({ success: true, data });
});

const getWallet = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await listWalletTransactions(req.params.id);
  res.json({ success: true, data });
});

const getRecurringDetail = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)
    .select("-attachments")
    .populate("clientId", "name companyName email phone website")
    .populate("brandId", "name logoUrl")
    .lean();
  if (!service) throw new ApiError(404, "Service not found");
  if (service.billingModel !== "recurring") {
    throw new ApiError(400, "Service is not recurring");
  }
  try {
    await syncRecurringBillingForService(service._id);
  } catch (err) {
    console.error("[recurring-billing] Recurring detail sync failed:", err.message);
  }
  const data = await buildRecurringServiceDetail(service);
  res.json({ success: true, data });
});

const patchCycleDeliverable = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await updateCycleDeliverable(
    req.params.id,
    req.params.cycleId,
    req.params.deliverableId,
    req.body
  );
  res.json({ success: true, data });
});

const postPayFreelancerDue = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const data = await payFreelancerDue(
    req.params.id,
    req.params.cycleId,
    req.params.dueId,
    req.body,
    req.admin.name
  );
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data });
});

const getCycleInvoice = asyncHandler(async (req, res) => {
  await ensureRecurringService(req.params.id);
  const { buffer, fileName } = await generateBillingCycleInvoicePdf(
    req.params.id,
    req.params.cycleId
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
});

module.exports = {
  getRecurringConfigHandler,
  patchRecurringConfigHandler,
  postTemplateDeliverable,
  putTemplateDeliverable,
  deleteTemplateDeliverableHandler,
  getBillingCycles,
  getWallet,
  getRecurringDetail,
  patchCycleDeliverable,
  postPayFreelancerDue,
  getCycleInvoice,
};
