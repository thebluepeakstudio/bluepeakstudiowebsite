const mongoose = require("mongoose");
const Service = require("../models/Service");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const RecurringDeliverableTemplate = require("../models/RecurringDeliverableTemplate");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const BillingCycleFreelancerDue = require("../models/BillingCycleFreelancerDue");
const FreelancerDue = require("../models/FreelancerDue");
const FreelancerPayment = require("../models/FreelancerPayment");
const PaymentAllocation = require("../models/PaymentAllocation");
const {
  syncDueForCycleDeliverable,
  payFreelancerDueRecord,
} = require("./freelancerDue.service");
const ApiError = require("../utils/ApiError");
const { syncClientToProject, applyBrandToServiceBody } = require("../utils/syncClientToProject");
const { normalizeServiceInput } = require("../utils/serviceCompat");
const { getOrCreateWallet } = require("./recurringWallet.service");
const {
  roundMoney,
  parseLocalDate,
  buildBillingDate,
  formatPeriodLabel,
  advancePeriod,
} = require("../utils/recurringDates");
const { listClientPayments } = require("./clientPaymentAllocation.service");
const {
  syncCurrentCycleAmount,
  syncTemplateToCurrentCycle,
} = require("./recurringTemplateApply.service");
const {
  normalizeApplyScope,
  getCurrentPeriodMonth,
  getCurrentBillingCycle,
  annotateCycleScope,
} = require("../utils/recurringCycleScope");

const SERVICE_CONTAINER_FIELDS = [
  "clientId",
  "brandId",
  "clientName",
  "businessName",
  "contactNumber",
  "email",
  "name",
  "description",
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
  "workStatus",
  "notes",
  "googleDriveLink",
  "projectTitle",
  "projectDescription",
];

const pickContainerFields = (body) => {
  const normalized = normalizeServiceInput(body);
  const payload = {};
  SERVICE_CONTAINER_FIELDS.forEach((key) => {
    if (normalized[key] !== undefined) payload[key] = normalized[key];
  });
  if (payload.projectTitle && !payload.name) payload.name = payload.projectTitle;
  if (payload.projectDescription && !payload.description) {
    payload.description = payload.projectDescription;
  }
  delete payload.projectTitle;
  delete payload.projectDescription;
  return payload;
};

const listTemplateDeliverables = async (serviceId) =>
  RecurringDeliverableTemplate.find({ serviceId, deletedAt: null })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

const createRecurringService = async (payload, adminName) => {
  const serviceData = payload.service || payload.project;
  const { config, templateDeliverables } = payload;

  if (!serviceData?.clientId) throw new ApiError(400, "Client is required");
  if (!config?.startDate) throw new ApiError(400, "Start date is required");
  if (!config?.billingDay) throw new ApiError(400, "Billing day is required");
  if (!templateDeliverables?.length) {
    throw new ApiError(400, "At least one template deliverable is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let body = pickContainerFields(serviceData);
    if (body.clientId) body = await syncClientToProject(body);
    body = await applyBrandToServiceBody(body);
    body.billingModel = "recurring";
    body.category = body.category || serviceData.category || serviceData.name;
    body.totalPrice = roundMoney(config.monthlyClientAmount);
    body.outsourcingCost = roundMoney(config.monthlyFreelancerCost);
    body.paymentStatus = "Pending";
    body.advanceReceived = 0;
    body.remainingAmount = roundMoney(config.monthlyClientAmount);

    const service = new Service(body);
    await service.save({ session });

    const [recurringConfig] = await RecurringServiceConfig.create(
      [
        {
          serviceId: service._id,
          startDate: parseLocalDate(config.startDate),
          billingFrequency: config.billingFrequency || "monthly",
          billingDay: config.billingDay,
          monthlyClientAmount: roundMoney(config.monthlyClientAmount),
          monthlyFreelancerCost: roundMoney(config.monthlyFreelancerCost),
          generationLeadDays: config.generationLeadDays || 5,
          status: config.status || "active",
        },
      ],
      { session }
    );

    const serviceCategory = body.category;
    const templateDocs = templateDeliverables.map((item, index) => ({
      serviceId: service._id,
      title: item.title,
      category: item.category || serviceCategory,
      description: item.description || "",
      sortOrder: item.sortOrder ?? index,
    }));
    await RecurringDeliverableTemplate.insertMany(templateDocs, { session });

    await getOrCreateWallet(service._id, session);

    await session.commitTransaction();
    return { service, project: service, config: recurringConfig };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const createRecurringProject = createRecurringService;

const getRecurringConfig = async (serviceId) => {
  const config = await RecurringServiceConfig.findOne({ serviceId }).lean();
  if (!config) throw new ApiError(404, "Recurring config not found");
  const templates = await listTemplateDeliverables(serviceId);
  return { config, templates };
};

const updateRecurringConfig = async (serviceId, updates) => {
  const config = await RecurringServiceConfig.findOne({ serviceId });
  if (!config) throw new ApiError(404, "Recurring config not found");

  const applyScope = normalizeApplyScope(updates.applyScope);

  const allowed = [
    "startDate",
    "billingDay",
    "monthlyClientAmount",
    "monthlyFreelancerCost",
    "generationLeadDays",
    "status",
    "billingFrequency",
  ];
  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      if (key === "startDate") config.startDate = parseLocalDate(updates[key]);
      else if (key === "monthlyClientAmount" || key === "monthlyFreelancerCost") {
        config[key] = roundMoney(updates[key]);
      } else config[key] = updates[key];
    }
  });
  await config.save();

  if (updates.monthlyClientAmount !== undefined || updates.monthlyFreelancerCost !== undefined) {
    await Service.findByIdAndUpdate(serviceId, {
      totalPrice: roundMoney(config.monthlyClientAmount),
      outsourcingCost: roundMoney(config.monthlyFreelancerCost),
    });

    if (applyScope === "current_and_future") {
      await syncCurrentCycleAmount(
        serviceId,
        config.monthlyClientAmount,
        config.monthlyFreelancerCost
      );
    }
  }

  return getRecurringConfig(serviceId);
};

const upsertTemplateDeliverable = async (serviceId, data, templateId = null) => {
  const applyScope = normalizeApplyScope(data.applyScope);
  let result;

  if (templateId) {
    const existing = await RecurringDeliverableTemplate.findOne({
      _id: templateId,
      serviceId,
      deletedAt: null,
    });
    if (!existing) throw new ApiError(404, "Template deliverable not found");
    Object.assign(existing, {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      sortOrder: data.sortOrder ?? existing.sortOrder,
    });
    await existing.save();
    result = existing.toObject();
  } else {
    const service = await Service.findById(serviceId).lean();
    const doc = await RecurringDeliverableTemplate.create({
      serviceId,
      title: data.title,
      category: data.category || service?.category || service?.name,
      description: data.description || "",
      sortOrder: data.sortOrder ?? 0,
    });
    result = doc.toObject();
  }

  await syncTemplateToCurrentCycle(serviceId, applyScope);
  return result;
};

const deleteTemplateDeliverable = async (serviceId, templateId, applyScope = "future_only") => {
  const doc = await RecurringDeliverableTemplate.findOneAndUpdate(
    { _id: templateId, serviceId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!doc) throw new ApiError(404, "Template deliverable not found");

  await syncTemplateToCurrentCycle(serviceId, applyScope);
  return doc;
};

const listBillingCycles = async (serviceId) => {
  const cycles = await BillingCycle.find({ serviceId }).sort({ periodMonth: -1 }).lean();
  if (!cycles.length) return [];

  const cycleIds = cycles.map((c) => c._id);
  const [invoices, deliverables, legacyFreelancerDues, cycleFreelancerDues] = await Promise.all([
    BillingCycleInvoice.find({ billingCycleId: { $in: cycleIds } }).lean(),
    BillingCycleDeliverable.find({ billingCycleId: { $in: cycleIds } })
      .sort({ sortOrder: 1 })
      .populate("freelancerId", "name")
      .populate("freelancerAssignments.freelancerId", "name")
      .lean(),
    BillingCycleFreelancerDue.find({ billingCycleId: { $in: cycleIds } }).lean(),
    FreelancerDue.find({
      billingCycleId: { $in: cycleIds },
      status: { $ne: "cancelled" },
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const invoiceByCycle = Object.fromEntries(invoices.map((i) => [i.billingCycleId.toString(), i]));
  const deliverablesByCycle = deliverables.reduce((acc, d) => {
    const key = d.billingCycleId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});
  const dueByCycle = Object.fromEntries(legacyFreelancerDues.map((d) => [d.billingCycleId.toString(), d]));
  const duesByCycle = cycleFreelancerDues.reduce((acc, due) => {
    const key = due.billingCycleId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      ...due,
      billingMonthLabel: due.billingMonth ? formatPeriodLabel(new Date(due.billingMonth)) : null,
      remaining: Math.max(0, roundMoney(due.amount - due.amountPaid)),
    });
    return acc;
  }, {});

  return cycles.map((cycle) => {
    const scope = annotateCycleScope(cycle);
    return {
      ...cycle,
      periodLabel: formatPeriodLabel(new Date(cycle.periodMonth)),
      isHistorical: scope.isHistorical,
      isCurrent: scope.isCurrent,
      invoice: invoiceByCycle[cycle._id.toString()] || null,
      deliverables: deliverablesByCycle[cycle._id.toString()] || [],
      freelancerDue: dueByCycle[cycle._id.toString()] || null,
      freelancerDues: duesByCycle[cycle._id.toString()] || [],
    };
  });
};

const buildRecurringServiceDetail = async (service) => {
  const { config, templates } = await getRecurringConfig(service._id);
  const wallet = await require("./recurringWallet.service").listWalletTransactions(service._id);
  const billingCycles = await listBillingCycles(service._id);

  const ALLOCATABLE_STATUSES = ["due", "partial", "overdue"];
  const dueInvoices = billingCycles
    .map((c) => c.invoice)
    .filter((inv) => inv && ALLOCATABLE_STATUSES.includes(inv.status));
  const outstandingAmount = roundMoney(
    dueInvoices.reduce((sum, inv) => {
      const open = roundMoney(inv.amountDue - inv.creditApplied - inv.amountPaid);
      return sum + Math.max(0, open);
    }, 0)
  );

  const invoiceIds = billingCycles
    .map((c) => c.invoice?._id)
    .filter(Boolean);
  const [allocations, allInvoices] = await Promise.all([
    PaymentAllocation.find({
      $or: [
        { targetType: "recurring_wallet", targetId: service._id },
        { targetType: "cycle_invoice", targetId: { $in: invoiceIds } },
      ],
    }).lean(),
    BillingCycleInvoice.find({ serviceId: service._id }).lean(),
  ]);

  const totalPaid = roundMoney(allocations.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  const lifetimeRevenue = roundMoney(
    allInvoices.reduce(
      (sum, inv) => sum + roundMoney(inv.amountPaid) + roundMoney(inv.creditApplied),
      0
    )
  );

  let nextBillingDate = null;
  const frequency = config?.billingFrequency || "monthly";
  if (config?.billingDay && config?.startDate) {
    const sortedCycles = [...billingCycles].sort(
      (a, b) => new Date(b.periodMonth) - new Date(a.periodMonth)
    );
    if (sortedCycles.length) {
      const lastPeriod = new Date(sortedCycles[0].periodMonth);
      const nextPeriod = advancePeriod(lastPeriod, frequency);
      nextBillingDate = buildBillingDate(
        nextPeriod.getFullYear(),
        nextPeriod.getMonth(),
        config.billingDay
      );
    } else {
      const start = parseLocalDate(config.startDate);
      nextBillingDate = buildBillingDate(
        start.getFullYear(),
        start.getMonth(),
        config.billingDay
      );
    }
  }

  let paymentHistory = [];
  if (service.clientId) {
    const clientId =
      typeof service.clientId === "object" ? service.clientId._id : service.clientId;
    const allPayments = await listClientPayments(clientId);
    paymentHistory = allPayments.filter((payment) => {
      if (payment.serviceId?.toString() === service._id.toString()) return true;
      return payment.allocations?.some(
        (row) =>
          (row.targetType === "recurring_wallet" &&
            row.targetId?.toString() === service._id.toString()) ||
          (row.targetType === "cycle_invoice" &&
            invoiceIds.some((id) => id.toString() === row.targetId?.toString()))
      );
    });
  }

  const { withLegacyServiceFields } = require("../utils/serviceCompat");
  const legacy = withLegacyServiceFields(service);
  const currentPeriod = getCurrentPeriodMonth(frequency, config?.startDate);
  const currentCycle = await getCurrentBillingCycle(service._id, currentPeriod);

  return {
    ...legacy,
    billingModel: "recurring",
    recurringConfig: config,
    templateDeliverables: templates,
    wallet,
    prepaidCredit: roundMoney(wallet.balance),
    billingCycles,
    billingFrequency: frequency,
    monthlyFee: roundMoney(config.monthlyClientAmount),
    currentRecurringAmount: roundMoney(config.monthlyClientAmount),
    currentBillingCycleId: currentCycle?._id || null,
    currentPeriodLabel: formatPeriodLabel(currentPeriod, frequency),
    applyScopeOptions: {
      currentCycleExists: !!currentCycle,
      currentPeriodLabel: formatPeriodLabel(currentPeriod, frequency),
    },
    nextBillingDate,
    outstandingAmount,
    totalPaid,
    lifetimeRevenue,
    paymentHistory,
    totalAmount: roundMoney(config.monthlyClientAmount),
    totalPrice: roundMoney(config.monthlyClientAmount),
    monthlyClientAmount: roundMoney(config.monthlyClientAmount),
    monthlyFreelancerCost: roundMoney(config.monthlyFreelancerCost),
    remainingAmount: outstandingAmount,
    paymentStatus: outstandingAmount <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending",
    advanceReceived: 0,
    services: [...new Set(templates.map((t) => t.category))],
    categories: [...new Set(templates.map((t) => t.category))],
    servicesCount: templates.length,
  };
};

const buildRecurringProjectDetail = buildRecurringServiceDetail;

const updateCycleDeliverable = async (serviceId, cycleId, deliverableId, updates) => {
  const deliverable = await BillingCycleDeliverable.findOne({
    _id: deliverableId,
    billingCycleId: cycleId,
    serviceId,
  });
  if (!deliverable) throw new ApiError(404, "Cycle deliverable not found");

  if (updates.status !== undefined) deliverable.status = updates.status;
  if (updates.progress !== undefined) deliverable.progress = updates.progress;
  if (updates.description !== undefined) deliverable.description = updates.description;
  if (updates.freelancerId !== undefined) {
    deliverable.freelancerId = updates.freelancerId || null;
  }
  if (updates.freelancerFee !== undefined) {
    deliverable.freelancerFee = roundMoney(updates.freelancerFee);
  }
  if (updates.freelancerAssignments !== undefined) {
    deliverable.freelancerAssignments = (updates.freelancerAssignments || [])
      .filter((row) => row.freelancerId)
      .map((row) => ({
        freelancerId: row.freelancerId,
        fee: roundMoney(row.fee),
      }));
    deliverable.freelancerId = null;
    deliverable.freelancerFee = 0;
  }
  await deliverable.save();
  await syncDueForCycleDeliverable(deliverable);
  return deliverable.toObject();
};

const payFreelancerDue = async (serviceId, cycleId, dueId, paymentData, adminName) => {
  const unifiedDue = await FreelancerDue.findOne({
    _id: dueId,
    serviceId,
    billingCycleId: cycleId,
  });
  if (unifiedDue) {
    return payFreelancerDueRecord(dueId, paymentData, adminName);
  }

  const due = await BillingCycleFreelancerDue.findOne({
    _id: dueId,
    billingCycleId: cycleId,
    serviceId,
  });
  if (!due) throw new ApiError(404, "Freelancer due not found");

  const amount = roundMoney(paymentData.amount);
  if (amount <= 0) throw new ApiError(400, "Payment amount must be positive");

  const remaining = roundMoney(due.amountDue - due.amountPaid);
  if (amount > remaining) throw new ApiError(400, "Payment exceeds remaining due");

  due.amountPaid = roundMoney(due.amountPaid + amount);
  if (due.amountPaid >= due.amountDue) {
    due.status = "paid";
    due.paidAt = new Date();
  } else {
    due.status = "partial";
  }
  await due.save();

  const payment = await FreelancerPayment.create({
    freelancerId: paymentData.freelancerId || due.freelancerId || undefined,
    serviceId,
    billingCycleFreelancerDueId: due._id,
    amount,
    paymentDate: paymentData.paymentDate || new Date(),
    paidVia: paymentData.paidVia || paymentData.method || "UPI",
    notes: paymentData.notes || "",
    recordedBy: adminName,
  });

  return { due: due.toObject(), payment: payment.toObject() };
};

module.exports = {
  createRecurringService,
  createRecurringProject,
  getRecurringConfig,
  updateRecurringConfig,
  listTemplateDeliverables,
  upsertTemplateDeliverable,
  deleteTemplateDeliverable,
  listBillingCycles,
  buildRecurringServiceDetail,
  buildRecurringProjectDetail,
  updateCycleDeliverable,
  payFreelancerDue,
};
