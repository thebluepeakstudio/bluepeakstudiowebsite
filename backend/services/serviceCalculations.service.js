const mongoose = require("mongoose");
const Deliverable = require("../models/Deliverable");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const RecurringDeliverableTemplate = require("../models/RecurringDeliverableTemplate");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const Expense = require("../models/Expense");
const { derivePaymentStatus, roundMoney } = require("./servicePayment.service");
const { withLegacyServiceFields } = require("../utils/serviceCompat");

const activeDeliverableFilter = { deletedAt: null };
const activeAssignmentFilter = { deletedAt: null };

const deriveOverallStatus = (deliverables) => {
  const active = deliverables.filter((d) => d.status !== "Cancelled");
  if (!active.length) return "Not Started";

  if (active.every((d) => d.status === "Delivered")) return "Delivered";
  if (active.some((d) => d.status !== "Not Started")) return "In Progress";
  return "Not Started";
};

const averageDeliverableProgress = (deliverables) => {
  const active = deliverables.filter((d) => d.status !== "Cancelled");
  if (!active.length) return 0;
  const sum = active.reduce((acc, d) => acc + (Number(d.progress) || 0), 0);
  return Math.round(sum / active.length);
};

const assignmentCostTotal = (assignments) =>
  assignments.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

const sumDeliverablePrices = (deliverables) =>
  deliverables
    .filter((d) => d.status !== "Cancelled")
    .reduce((sum, d) => sum + (Number(d.sellingPrice) || 0), 0);

const deliverableProfit = (deliverable, assignments = []) => {
  const price = Number(deliverable.sellingPrice) || 0;
  const cost = assignmentCostTotal(assignments);
  return price - cost;
};

const getDeliverablesForService = async (serviceId, session = null) => {
  const query = Deliverable.find({ serviceId, ...activeDeliverableFilter }).sort({
    createdAt: 1,
  });
  if (session) query.session(session);
  return query.lean();
};

const getDeliverablesForProject = getDeliverablesForService;

const getAssignmentsForDeliverables = async (deliverableIds, session = null) => {
  if (!deliverableIds.length) return [];
  const query = DeliverableAssignment.find({
    deliverableId: { $in: deliverableIds },
    ...activeAssignmentFilter,
  }).populate("freelancerId", "name email contactNumber skills");
  if (session) query.session(session);
  return query.lean();
};

const getServiceExpensesTotal = async (serviceId) => {
  const id = typeof serviceId === "string" ? new mongoose.Types.ObjectId(serviceId) : serviceId;
  const rows = await Expense.aggregate([
    { $match: { $or: [{ serviceId: id }, { projectId: id }] } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return rows[0]?.total || 0;
};

const getProjectExpensesTotal = getServiceExpensesTotal;

const computeServiceProfit = async (serviceId, deliverables, assignmentsByDeliverable) => {
  let deliverableProfitTotal = 0;
  for (const d of deliverables) {
    const assignments = assignmentsByDeliverable[d._id.toString()] || [];
    deliverableProfitTotal += deliverableProfit(d, assignments);
  }
  const expenseTotal = await getServiceExpensesTotal(serviceId);
  return deliverableProfitTotal - expenseTotal;
};

const computeProjectProfit = computeServiceProfit;

const buildServicesSummary = (deliverables) => {
  const active = deliverables.filter((d) => d.status !== "Cancelled");
  return {
    services: active.slice(0, 3).map((d) => d.title),
    servicesCount: active.length,
    categories: [...new Set(active.map((d) => d.category))],
  };
};

const groupDeliverablesByService = (deliverables) => {
  const byService = {};
  for (const d of deliverables) {
    const key = (d.serviceId || d.projectId).toString();
    if (!byService[key]) byService[key] = [];
    byService[key].push(d);
  }
  return byService;
};

const groupDeliverablesByProject = groupDeliverablesByService;

const withPaymentSummary = (doc, totalAmount) => {
  const totalReceived = roundMoney(doc.advanceReceived);
  const remainingAmount = Math.max(0, roundMoney(totalAmount - totalReceived));
  const paymentStatus = derivePaymentStatus(totalReceived, totalAmount);
  return {
    totalAmount,
    totalPrice: totalAmount,
    totalReceived,
    remainingAmount,
    paymentStatus,
    advanceReceived: totalReceived,
  };
};

const enrichServiceWithDeliverables = (service, deliverableList = []) => {
  const doc = withLegacyServiceFields(
    typeof service.toObject === "function" ? service.toObject() : { ...service }
  );
  const totalAmount =
    deliverableList.length > 0
      ? roundMoney(sumDeliverablePrices(deliverableList))
      : roundMoney(doc.totalPrice ?? doc.totalAmount);

  if (deliverableList.length) {
    const overallStatus = deriveOverallStatus(deliverableList);
    return {
      ...doc,
      ...withPaymentSummary(doc, totalAmount),
      workStatus: overallStatus,
      ...buildServicesSummary(deliverableList),
      overallStatus,
      projectName: doc.name || doc.clientName,
    };
  }

  return {
    ...doc,
    ...withPaymentSummary(doc, totalAmount),
    services: doc.category ? [doc.category] : [],
    servicesCount: doc.category ? 1 : 0,
    categories: doc.category ? [doc.category] : [],
    overallStatus: doc.workStatus,
    projectName: doc.name || doc.clientName,
  };
};

const enrichProjectWithDeliverables = enrichServiceWithDeliverables;

const enrichServicesWithDeliverables = async (services) => {
  if (!services.length) return [];

  const ids = services.map((p) => p._id);
  const recurringIds = services.filter((p) => p.billingModel === "recurring").map((p) => p._id);
  const oneTimeIds = services.filter((p) => p.billingModel !== "recurring").map((p) => p._id);

  const [deliverables, recurringConfigs, recurringTemplates] = await Promise.all([
    oneTimeIds.length
      ? Deliverable.find({
          serviceId: { $in: oneTimeIds },
          ...activeDeliverableFilter,
        })
          .select("serviceId title category status sellingPrice")
          .sort({ createdAt: 1 })
          .lean()
      : [],
    recurringIds.length
      ? RecurringServiceConfig.find({ serviceId: { $in: recurringIds } }).lean()
      : [],
    recurringIds.length
      ? RecurringDeliverableTemplate.find({ serviceId: { $in: recurringIds }, deletedAt: null })
          .select("serviceId title category sortOrder")
          .sort({ sortOrder: 1 })
          .lean()
      : [],
  ]);

  const byService = groupDeliverablesByService(deliverables);
  const configByService = Object.fromEntries(
    recurringConfigs.map((c) => [c.serviceId.toString(), c])
  );
  const templatesByService = recurringTemplates.reduce((acc, tpl) => {
    const key = tpl.serviceId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(tpl);
    return acc;
  }, {});

  return services.map((p) => {
    const legacy = withLegacyServiceFields(p);
    if (p.billingModel === "recurring") {
      const config = configByService[p._id.toString()];
      const templates = templatesByService[p._id.toString()] || [];
      const totalAmount = roundMoney(config?.monthlyClientAmount || legacy.totalPrice);
      return {
        ...legacy,
        ...withPaymentSummary({ ...legacy, advanceReceived: 0 }, totalAmount),
        workStatus: config?.status === "paused" ? "Paused" : p.workStatus || "In Progress",
        services: templates.slice(0, 3).map((t) => t.title),
        servicesCount: templates.length,
        categories: [...new Set(templates.map((t) => t.category))],
        overallStatus: p.workStatus || "In Progress",
        projectName: legacy.name || legacy.clientName,
        billingModel: "recurring",
        monthlyClientAmount: totalAmount,
      };
    }
    return enrichServiceWithDeliverables(p, byService[p._id.toString()] || []);
  });
};

const enrichProjectsWithDeliverables = enrichServicesWithDeliverables;

module.exports = {
  activeDeliverableFilter,
  activeAssignmentFilter,
  deriveOverallStatus,
  averageDeliverableProgress,
  assignmentCostTotal,
  sumDeliverablePrices,
  deliverableProfit,
  getDeliverablesForService,
  getDeliverablesForProject,
  getAssignmentsForDeliverables,
  getServiceExpensesTotal,
  getProjectExpensesTotal,
  computeServiceProfit,
  computeProjectProfit,
  buildServicesSummary,
  groupDeliverablesByService,
  groupDeliverablesByProject,
  enrichServiceWithDeliverables,
  enrichProjectWithDeliverables,
  enrichServicesWithDeliverables,
  enrichProjectsWithDeliverables,
};
