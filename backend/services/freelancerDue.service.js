const FreelancerDue = require("../models/FreelancerDue");
const FreelancerPayment = require("../models/FreelancerPayment");
const Deliverable = require("../models/Deliverable");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const BillingCycle = require("../models/BillingCycle");
const Service = require("../models/Service");
const ApiError = require("../utils/ApiError");
const { DELIVERABLE_DUE_TRIGGER_STATUSES } = require("../constants/serviceCategories");
const { roundMoney } = require("../utils/recurringDates");
const { formatPeriodLabel } = require("../utils/recurringDates");

const isDueTriggerStatus = (status) => DELIVERABLE_DUE_TRIGGER_STATUSES.includes(status);

const getCycleDeliverableAssignments = (cycleDeliverable) => {
  if (Array.isArray(cycleDeliverable.freelancerAssignments) && cycleDeliverable.freelancerAssignments.length) {
    return cycleDeliverable.freelancerAssignments;
  }
  if (cycleDeliverable.freelancerId) {
    return [
      {
        freelancerId: cycleDeliverable.freelancerId,
        fee: roundMoney(cycleDeliverable.freelancerFee),
      },
    ];
  }
  return [];
};

const cancelCycleDeliverableDues = async (cycleDeliverableId, session = null, exceptFreelancerIds = null) => {
  const filter = {
    billingCycleDeliverableId: cycleDeliverableId,
    status: { $in: ["pending", "partial"] },
  };
  if (exceptFreelancerIds) {
    filter.freelancerId = { $nin: [...exceptFreelancerIds] };
  }
  const query = FreelancerDue.find(filter);
  if (session) query.session(session);
  const dues = await query;
  for (const due of dues) {
    due.status = "cancelled";
    due.cancelledAt = new Date();
    await due.save(session ? { session } : undefined);
  }
};

const resolveServiceContext = async (serviceId, session = null) => {
  const query = Service.findById(serviceId)
    .populate("clientId", "name companyName")
    .populate("brandId", "name")
    .lean();
  if (session) query.session(session);
  const service = await query;
  if (!service) throw new ApiError(404, "Service not found");

  const clientName =
    service.clientId?.companyName ||
    service.clientId?.name ||
    service.clientName ||
    "";
  const brandName = service.brandId?.name || service.businessName || "";
  const serviceTitle =
    service.name || service.projectTitle || service.category || "Service";

  return {
    clientId: service.clientId?._id || service.clientId,
    brandId: service.brandId?._id || service.brandId || null,
    clientName,
    brandName,
    serviceTitle,
  };
};

const cancelOpenDue = async (filter, session = null) => {
  const query = FreelancerDue.findOne({
    ...filter,
    status: { $in: ["pending", "partial"] },
  });
  if (session) query.session(session);
  const due = await query;
  if (!due) return null;
  due.status = "cancelled";
  due.cancelledAt = new Date();
  await due.save(session ? { session } : undefined);
  return due;
};

const upsertFreelancerDue = async (payload, session = null) => {
  const filter = payload.deliverableAssignmentId
    ? { deliverableAssignmentId: payload.deliverableAssignmentId }
    : payload.billingCycleDeliverableId
      ? {
          billingCycleDeliverableId: payload.billingCycleDeliverableId,
          freelancerId: payload.freelancerId,
        }
      : payload.legacyBillingCycleFreelancerDueId
        ? { legacyBillingCycleFreelancerDueId: payload.legacyBillingCycleFreelancerDueId }
        : null;

  if (!filter) return null;

  const findQuery = FreelancerDue.findOne(filter);
  if (session) findQuery.session(session);
  let due = await findQuery;

  if (due && due.status === "paid") {
    return due;
  }

  if (due && due.status === "cancelled") {
    due.status = "pending";
    due.cancelledAt = null;
  }

  const amount = roundMoney(payload.amount);
  if (amount <= 0) {
    if (due) await cancelOpenDue(filter, session);
    return null;
  }

  const data = {
    ...payload,
    amount,
  };

  if (due) {
    Object.assign(due, data);
    if (due.amountPaid > amount) due.amountPaid = amount;
    await due.save(session ? { session } : undefined);
    return due;
  }

  const created = await FreelancerDue.create([data], session ? { session } : undefined);
  return created[0];
};

const syncDueForAssignment = async (assignment, session = null) => {
  if (!assignment || assignment.deletedAt) return null;

  const deliverableQuery = Deliverable.findById(assignment.deliverableId);
  if (session) deliverableQuery.session(session);
  const deliverable = await deliverableQuery;
  if (!deliverable || deliverable.deletedAt) {
    await cancelOpenDue({ deliverableAssignmentId: assignment._id }, session);
    return null;
  }

  const cost = roundMoney(assignment.cost);
  if (!assignment.freelancerId || cost <= 0) {
    await cancelOpenDue({ deliverableAssignmentId: assignment._id }, session);
    return null;
  }

  if (!isDueTriggerStatus(deliverable.status)) {
    await cancelOpenDue({ deliverableAssignmentId: assignment._id }, session);
    return null;
  }

  const ctx = await resolveServiceContext(deliverable.serviceId, session);

  return upsertFreelancerDue(
    {
      freelancerId: assignment.freelancerId,
      clientId: ctx.clientId,
      brandId: ctx.brandId,
      serviceId: deliverable.serviceId,
      deliverableId: deliverable._id,
      deliverableAssignmentId: assignment._id,
      deliverableTitle: deliverable.title,
      serviceTitle: ctx.serviceTitle,
      clientName: ctx.clientName,
      brandName: ctx.brandName,
      amount: cost,
      amountPaid: roundMoney(assignment.amountPaid),
      notes: assignment.remarks || "",
    },
    session
  );
};

const syncDueForDeliverableStatus = async (deliverableId, session = null) => {
  const assignmentsQuery = DeliverableAssignment.find({
    deliverableId,
    deletedAt: null,
  });
  if (session) assignmentsQuery.session(session);
  const assignments = await assignmentsQuery;
  const results = [];
  for (const assignment of assignments) {
    results.push(await syncDueForAssignment(assignment, session));
  }
  return results.filter(Boolean);
};

const syncDueForCycleDeliverable = async (cycleDeliverable, session = null) => {
  if (!cycleDeliverable) return [];

  const assignments = getCycleDeliverableAssignments(cycleDeliverable);

  if (!isDueTriggerStatus(cycleDeliverable.status)) {
    await cancelCycleDeliverableDues(cycleDeliverable._id, session);
    return [];
  }

  const cycleQuery = BillingCycle.findById(cycleDeliverable.billingCycleId);
  if (session) cycleQuery.session(session);
  const cycle = await cycleQuery;
  const ctx = await resolveServiceContext(cycleDeliverable.serviceId, session);

  const activeFreelancerIds = [];
  const results = [];

  for (const row of assignments) {
    const freelancerId = row.freelancerId?._id || row.freelancerId;
    const fee = roundMoney(row.fee);
    if (!freelancerId || fee <= 0) continue;

    activeFreelancerIds.push(freelancerId);

    const existingPaidQuery = FreelancerDue.findOne({
      billingCycleDeliverableId: cycleDeliverable._id,
      freelancerId,
      status: "paid",
    });
    if (session) existingPaidQuery.session(session);
    const paidDue = await existingPaidQuery;
    if (paidDue) {
      results.push(paidDue);
      continue;
    }

    const due = await upsertFreelancerDue(
      {
        freelancerId,
        clientId: ctx.clientId,
        brandId: ctx.brandId,
        serviceId: cycleDeliverable.serviceId,
        billingCycleId: cycleDeliverable.billingCycleId,
        billingMonth: cycle?.periodMonth || null,
        billingCycleDeliverableId: cycleDeliverable._id,
        deliverableTitle: cycleDeliverable.title,
        serviceTitle: ctx.serviceTitle,
        clientName: ctx.clientName,
        brandName: ctx.brandName,
        amount: fee,
        amountPaid: 0,
      },
      session
    );
    if (due) results.push(due);
  }

  await cancelCycleDeliverableDues(cycleDeliverable._id, session, activeFreelancerIds);
  return results;
};

const payFreelancerDueRecord = async (dueId, paymentData, adminName, session = null) => {
  const dueQuery = FreelancerDue.findById(dueId);
  if (session) dueQuery.session(session);
  const due = await dueQuery;
  if (!due) throw new ApiError(404, "Freelancer due not found");
  if (due.status === "cancelled") throw new ApiError(400, "This due has been cancelled");
  if (due.status === "paid") throw new ApiError(400, "This due is already paid");

  const amount = roundMoney(paymentData.amount);
  if (amount <= 0) throw new ApiError(400, "Payment amount must be positive");

  const remaining = roundMoney(due.amount - due.amountPaid);
  if (amount > remaining) throw new ApiError(400, "Payment exceeds remaining due");

  due.amountPaid = roundMoney(due.amountPaid + amount);
  if (paymentData.paidVia || paymentData.method) {
    due.paymentMethod = paymentData.paidVia || paymentData.method;
  }
  if (paymentData.transactionReference) {
    due.transactionReference = paymentData.transactionReference;
  }
  if (paymentData.notes) {
    due.notes = paymentData.notes;
  }
  await due.save(session ? { session } : undefined);

  if (due.deliverableAssignmentId) {
    const assignmentQuery = DeliverableAssignment.findById(due.deliverableAssignmentId);
    if (session) assignmentQuery.session(session);
    const assignment = await assignmentQuery;
    if (assignment && !assignment.deletedAt) {
      assignment.amountPaid = due.amountPaid;
      await assignment.save(session ? { session } : undefined);
    }
  }

  const payment = await FreelancerPayment.create(
    [
      {
        freelancerId: paymentData.freelancerId || due.freelancerId,
        serviceId: due.serviceId,
        deliverableId: due.deliverableId || undefined,
        assignmentId: due.deliverableAssignmentId || undefined,
        billingCycleFreelancerDueId: due.legacyBillingCycleFreelancerDueId || undefined,
        freelancerDueId: due._id,
        amount,
        paymentDate: paymentData.paymentDate || new Date(),
        paidVia: paymentData.paidVia || paymentData.method || "UPI",
        transactionReference: paymentData.transactionReference || "",
        notes: paymentData.notes || "",
        recordedBy: adminName,
      },
    ],
    session ? { session } : undefined
  );

  return { due: due.toObject(), payment: payment[0].toObject() };
};

const listDuesForFreelancer = async (freelancerId, { status, limit = 100 } = {}) => {
  const filter = { freelancerId };
  if (status) {
    filter.status = Array.isArray(status) ? { $in: status } : status;
  }

  const dues = await FreelancerDue.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return dues.map((due) => ({
    ...due,
    billingMonthLabel: due.billingMonth
      ? formatPeriodLabel(new Date(due.billingMonth))
      : null,
    remaining: Math.max(0, roundMoney(due.amount - due.amountPaid)),
  }));
};

const listUpcomingAssignments = async (freelancerId) => {
  const assignments = await DeliverableAssignment.find({
    freelancerId,
    deletedAt: null,
    cost: { $gt: 0 },
  })
    .populate({
      path: "deliverableId",
      select: "title status serviceId",
      match: { deletedAt: null },
    })
    .lean();

  const cycleDeliverables = await BillingCycleDeliverable.find({
    freelancerId,
    freelancerFee: { $gt: 0 },
    status: { $nin: DELIVERABLE_DUE_TRIGGER_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();

  const serviceIds = new Set();
  assignments.forEach((a) => {
    if (a.deliverableId?.serviceId) serviceIds.add(a.deliverableId.serviceId.toString());
  });
  cycleDeliverables.forEach((d) => serviceIds.add(d.serviceId.toString()));

  const services = await Service.find({ _id: { $in: [...serviceIds] } })
    .select("name projectTitle category clientName businessName clientId brandId")
    .lean();
  const serviceMap = Object.fromEntries(services.map((s) => [s._id.toString(), s]));

  const cycleIds = [...new Set(cycleDeliverables.map((d) => d.billingCycleId.toString()))];
  const cycles = await BillingCycle.find({ _id: { $in: cycleIds } }).lean();
  const cycleMap = Object.fromEntries(cycles.map((c) => [c._id.toString(), c]));

  const oneTime = assignments
    .filter((a) => a.deliverableId && !isDueTriggerStatus(a.deliverableId.status))
    .map((a) => {
      const service = serviceMap[a.deliverableId.serviceId.toString()];
      return {
        type: "one_time",
        deliverableTitle: a.deliverableId.title,
        serviceTitle: service?.name || service?.projectTitle || "Service",
        clientName: service?.clientName || "",
        brandName: service?.businessName || "",
        amount: roundMoney(a.cost),
        status: a.deliverableId.status,
        serviceId: a.deliverableId.serviceId,
        deliverableId: a.deliverableId._id,
        assignmentId: a._id,
      };
    });

  const recurring = cycleDeliverables.map((d) => {
    const service = serviceMap[d.serviceId.toString()];
    const cycle = cycleMap[d.billingCycleId.toString()];
    return {
      type: "recurring",
      deliverableTitle: d.title,
      serviceTitle: service?.name || service?.projectTitle || "Service",
      clientName: service?.clientName || "",
      brandName: service?.businessName || "",
      amount: roundMoney(d.freelancerFee),
      status: d.status,
      billingMonthLabel: cycle ? formatPeriodLabel(new Date(cycle.periodMonth)) : null,
      serviceId: d.serviceId,
      billingCycleDeliverableId: d._id,
      billingCycleId: d.billingCycleId,
    };
  });

  return [...oneTime, ...recurring];
};

const getFreelancerDashboard = async (freelancerId) => {
  const [dues, payments, upcoming] = await Promise.all([
    listDuesForFreelancer(freelancerId, { limit: 200 }),
    FreelancerPayment.find({ freelancerId })
      .sort({ paymentDate: -1 })
      .limit(50)
      .lean(),
    listUpcomingAssignments(freelancerId),
  ]);

  const pendingDues = dues.filter((d) => ["pending", "partial"].includes(d.status));
  const paidDues = dues.filter((d) => d.status === "paid");

  const pendingAmount = roundMoney(
    pendingDues.reduce((sum, d) => sum + Math.max(0, d.amount - d.amountPaid), 0)
  );
  const totalPaid = roundMoney(
    dues.reduce((sum, d) => sum + (d.amountPaid || 0), 0)
  );
  const upcomingAmount = roundMoney(upcoming.reduce((sum, u) => sum + u.amount, 0));

  const monthlyEarnings = {};
  for (const payment of payments) {
    const d = new Date(payment.paymentDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyEarnings[key] = roundMoney((monthlyEarnings[key] || 0) + payment.amount);
  }

  const clientWiseEarnings = {};
  for (const due of paidDues) {
    const key = due.clientName || "Unknown";
    clientWiseEarnings[key] = roundMoney((clientWiseEarnings[key] || 0) + due.amountPaid);
  }

  const recentWork = dues.slice(0, 20).map((d) => ({
    dueId: d._id,
    clientName: d.clientName,
    brandName: d.brandName,
    serviceTitle: d.serviceTitle,
    deliverableTitle: d.deliverableTitle,
    billingMonthLabel: d.billingMonthLabel,
    amount: d.amount,
    amountPaid: d.amountPaid,
    status: d.status,
    createdAt: d.createdAt,
    paidAt: d.paidAt,
  }));

  return {
    pendingAmount,
    totalPaid,
    upcomingAmount,
    pendingDues,
    paidDues: paidDues.slice(0, 30),
    upcomingDues: upcoming,
    assignedDeliverables: upcoming,
    completedPayments: payments.slice(0, 30),
    recentWork,
    monthlyEarnings: Object.entries(monthlyEarnings)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, amount]) => ({ month, amount })),
    clientWiseEarnings: Object.entries(clientWiseEarnings)
      .sort(([, a], [, b]) => b - a)
      .map(([clientName, amount]) => ({ clientName, amount })),
    totalOwed: roundMoney(pendingAmount + upcomingAmount + totalPaid),
    amountDue: pendingAmount,
  };
};

const aggregateFreelancerCosts = async (match = {}) => {
  const rows = await FreelancerDue.aggregate([
    {
      $match: {
        status: { $in: ["pending", "partial", "paid"] },
        ...match,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$amount", 0] } },
      },
    },
  ]);
  const fromDues = rows[0]?.total || 0;
  if (fromDues > 0) return fromDues;

  const DeliverableAssignment = require("../models/DeliverableAssignment");
  const { activeAssignmentFilter } = require("./serviceCalculations.service");
  const legacyRows = await DeliverableAssignment.aggregate([
    { $match: { ...activeAssignmentFilter, ...match } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$cost", 0] } } } },
  ]);
  return legacyRows[0]?.total || 0;
};

const aggregateFreelancerCostsByMonth = async (rangeStart, rangeEnd) => {
  const rows = await FreelancerDue.aggregate([
    {
      $match: {
        status: { $in: ["pending", "partial", "paid"] },
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
        total: { $sum: { $ifNull: ["$amount", 0] } },
      },
    },
  ]);
  if (rows.length) return rows;

  const DeliverableAssignment = require("../models/DeliverableAssignment");
  const { activeAssignmentFilter } = require("./serviceCalculations.service");
  return DeliverableAssignment.aggregate([
    {
      $match: {
        ...activeAssignmentFilter,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
        total: { $sum: { $ifNull: ["$cost", 0] } },
      },
    },
  ]);
};

module.exports = {
  isDueTriggerStatus,
  resolveServiceContext,
  syncDueForAssignment,
  syncDueForDeliverableStatus,
  syncDueForCycleDeliverable,
  payFreelancerDueRecord,
  listDuesForFreelancer,
  listUpcomingAssignments,
  getFreelancerDashboard,
  aggregateFreelancerCosts,
  aggregateFreelancerCostsByMonth,
  cancelOpenDue,
  upsertFreelancerDue,
  cancelCycleDeliverableDues,
};
