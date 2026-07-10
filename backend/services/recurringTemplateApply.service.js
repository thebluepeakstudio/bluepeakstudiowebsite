const Service = require("../models/Service");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const RecurringDeliverableTemplate = require("../models/RecurringDeliverableTemplate");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const FreelancerDue = require("../models/FreelancerDue");
const ApiError = require("../utils/ApiError");
const { roundMoney } = require("../utils/recurringDates");
const {
  normalizeApplyScope,
  getCurrentBillingCycle,
  assertNotHistoricalCycle,
  isHistoricalCycle,
} = require("../utils/recurringCycleScope");
const { deriveInvoiceStatus } = require("./recurringWallet.service");
const { cancelCycleDeliverableDues } = require("./freelancerDue.service");

const syncCurrentCycleAmount = async (serviceId, amount, freelancerCost) => {
  const currentCycle = await getCurrentBillingCycle(serviceId);
  if (!currentCycle) return { appliedToCurrentCycle: false };

  assertNotHistoricalCycle(currentCycle);

  await BillingCycle.findByIdAndUpdate(currentCycle._id, {
    clientAmountSnapshot: roundMoney(amount),
    ...(freelancerCost !== undefined
      ? { freelancerCostSnapshot: roundMoney(freelancerCost) }
      : {}),
  });

  const invoice = await BillingCycleInvoice.findOne({ billingCycleId: currentCycle._id });
  if (invoice) {
    invoice.amountDue = roundMoney(amount);
    invoice.status = deriveInvoiceStatus(invoice);
    if (invoice.status === "paid" && !invoice.paidAt) invoice.paidAt = new Date();
    await invoice.save();
  }

  return { appliedToCurrentCycle: true, cycleId: currentCycle._id };
};

const applyRecurringAmountChange = async (serviceId, newAmount, scope, options = {}) => {
  const applyScope = normalizeApplyScope(scope);
  const amount = roundMoney(newAmount);
  const { freelancerCost } = options;

  const config = await RecurringServiceConfig.findOne({ serviceId });
  if (!config) throw new ApiError(404, "Recurring config not found");

  config.monthlyClientAmount = amount;
  if (freelancerCost !== undefined) {
    config.monthlyFreelancerCost = roundMoney(freelancerCost);
  }
  await config.save();

  const serviceUpdate = { totalPrice: amount };
  if (freelancerCost !== undefined) {
    serviceUpdate.outsourcingCost = roundMoney(freelancerCost);
  }
  await Service.findByIdAndUpdate(serviceId, serviceUpdate);

  if (applyScope !== "current_and_future") {
    return { appliedToCurrentCycle: false };
  }

  return syncCurrentCycleAmount(serviceId, amount, freelancerCost);
};

const removeOrCancelCycleDeliverable = async (deliverable) => {
  const hasPaidDue = await FreelancerDue.exists({
    billingCycleDeliverableId: deliverable._id,
    status: "paid",
  });
  const hasAnyDue = await FreelancerDue.exists({
    billingCycleDeliverableId: deliverable._id,
    status: { $ne: "cancelled" },
  });

  if (hasPaidDue || hasAnyDue) {
    deliverable.status = "Cancelled";
    await deliverable.save();
    await cancelCycleDeliverableDues(deliverable._id);
    return "cancelled";
  }

  await cancelCycleDeliverableDues(deliverable._id);
  await BillingCycleDeliverable.findByIdAndDelete(deliverable._id);
  return "deleted";
};

const syncTemplateToCurrentCycle = async (serviceId, scope) => {
  const applyScope = normalizeApplyScope(scope);
  if (applyScope !== "current_and_future") {
    return { synced: false };
  }

  const currentCycle = await getCurrentBillingCycle(serviceId);
  if (!currentCycle) {
    return { synced: false };
  }

  if (isHistoricalCycle(currentCycle)) {
    throw new ApiError(400, "Historical billing cycles cannot be modified");
  }

  const templates = await RecurringDeliverableTemplate.find({
    serviceId,
    deletedAt: null,
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  const activeTemplateIds = new Set(templates.map((tpl) => String(tpl._id)));
  const existingDeliverables = await BillingCycleDeliverable.find({
    billingCycleId: currentCycle._id,
    serviceId,
  });

  const existingByTemplateId = new Map(
    existingDeliverables
      .filter((row) => row.templateDeliverableId)
      .map((row) => [String(row.templateDeliverableId), row])
  );

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [index, tpl] of templates.entries()) {
    const key = String(tpl._id);
    const existing = existingByTemplateId.get(key);

    if (existing) {
      existing.title = tpl.title;
      existing.category = tpl.category;
      existing.description = tpl.description || "";
      existing.sortOrder = tpl.sortOrder ?? index;
      await existing.save();
      updated += 1;
      continue;
    }

    await BillingCycleDeliverable.create({
      billingCycleId: currentCycle._id,
      serviceId,
      templateDeliverableId: tpl._id,
      title: tpl.title,
      category: tpl.category,
      description: tpl.description || "",
      sortOrder: tpl.sortOrder ?? index,
      status: "Not Started",
      freelancerId: null,
      freelancerFee: 0,
      freelancerAssignments: [],
    });
    added += 1;
  }

  for (const deliverable of existingDeliverables) {
    const templateId = deliverable.templateDeliverableId
      ? String(deliverable.templateDeliverableId)
      : null;
    if (!templateId || !activeTemplateIds.has(templateId)) {
      const result = await removeOrCancelCycleDeliverable(deliverable);
      if (result) removed += 1;
    }
  }

  return {
    synced: true,
    cycleId: currentCycle._id,
    added,
    updated,
    removed,
  };
};

module.exports = {
  applyRecurringAmountChange,
  syncCurrentCycleAmount,
  syncTemplateToCurrentCycle,
  removeOrCancelCycleDeliverable,
};
