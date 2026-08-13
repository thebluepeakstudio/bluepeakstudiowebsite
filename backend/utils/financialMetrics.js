const Service = require("../models/Service");
const Project = require("../models/Project");
const Deliverable = require("../models/Deliverable");
const Expense = require("../models/Expense");
const ServicePayment = require("../models/ServicePayment");
const ProjectPayment = require("../models/ProjectPayment");
const ClientPayment = require("../models/ClientPayment");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const { roundMoney } = require("../services/servicePayment.service");
const { activeDeliverableFilter } = require("../services/serviceCalculations.service");
const {
  aggregateFreelancerCosts: aggregateFreelancerCostsFromDues,
} = require("../services/freelancerDue.service");
const { legacyFreelancerCostPipeline } = require("./freelancerCosts");

const OPEN_RECURRING_INVOICE_STATUSES = ["due", "partial", "overdue"];

/** Legacy projects already represented as Service rows (avoid double-counting). */
async function getMigratedLegacyProjectIds() {
  const rows = await Service.find({ legacyProjectId: { $ne: null } })
    .select("legacyProjectId")
    .lean();
  return rows.map((r) => r.legacyProjectId);
}

/**
 * Booked revenue: one-time project values + recurring cash collected (paid + wallet credit applied).
 */
async function aggregateBookedRevenue() {
  const migratedIds = await getMigratedLegacyProjectIds();

  const [deliverableRevenue, serviceOnlyRevenue, projectLegacy, recurringCollected] =
    await Promise.all([
      Deliverable.aggregate([
        { $match: activeDeliverableFilter },
        {
          $lookup: {
            from: Service.collection.name,
            localField: "serviceId",
            foreignField: "_id",
            as: "service",
          },
        },
        { $unwind: "$service" },
        { $match: { "service.billingModel": { $ne: "recurring" } } },
        {
          $group: {
            _id: "$serviceId",
            total: { $sum: { $ifNull: ["$sellingPrice", 0] } },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Service.aggregate([
        { $match: { billingModel: { $ne: "recurring" } } },
        {
          $lookup: {
            from: Deliverable.collection.name,
            let: { sid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$serviceId", "$$sid"] },
                  deletedAt: null,
                },
              },
              { $limit: 1 },
            ],
            as: "deliverables",
          },
        },
        { $match: { deliverables: { $size: 0 } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", 0] } } } },
      ]),
      migratedIds.length
        ? Project.aggregate([
            { $match: { _id: { $nin: migratedIds } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$totalAmount", 0] } } } },
          ])
        : Project.aggregate([
            { $group: { _id: null, total: { $sum: { $ifNull: ["$totalAmount", 0] } } } },
          ]),
      BillingCycleInvoice.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $add: [{ $ifNull: ["$amountPaid", 0] }, { $ifNull: ["$creditApplied", 0] }],
              },
            },
          },
        },
      ]),
    ]);

  return roundMoney(
    (deliverableRevenue[0]?.total || 0) +
      (serviceOnlyRevenue[0]?.total || 0) +
      (projectLegacy[0]?.total || 0) +
      (recurringCollected[0]?.total || 0)
  );
}

async function aggregateTotalExpenses() {
  const rows = await Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  return roundMoney(rows[0]?.total || 0);
}

async function aggregateDecreeExpenses() {
  const rows = await Expense.aggregate([
    { $match: { category: "Decree" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return roundMoney(rows[0]?.total || 0);
}

/** Open balance on recurring invoices that are due / partial / overdue. */
async function aggregateRecurringOutstanding() {
  const rows = await BillingCycleInvoice.aggregate([
    { $match: { status: { $in: OPEN_RECURRING_INVOICE_STATUSES } } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ["$amountDue", 0] },
                  {
                    $add: [{ $ifNull: ["$creditApplied", 0] }, { $ifNull: ["$amountPaid", 0] }],
                  },
                ],
              },
            ],
          },
        },
      },
    },
  ]);
  return roundMoney(rows[0]?.total || 0);
}

async function aggregateClientOutstanding() {
  const migratedIds = await getMigratedLegacyProjectIds();

  const [oneTimeOutstanding, recurringOutstanding, projectRows] = await Promise.all([
    Service.aggregate([
      { $match: { billingModel: { $ne: "recurring" } } },
      {
        $lookup: {
          from: Deliverable.collection.name,
          let: { sid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$serviceId", "$$sid"] },
                deletedAt: null,
              },
            },
            {
              $group: {
                _id: null,
                booked: { $sum: { $ifNull: ["$sellingPrice", 0] } },
              },
            },
          ],
          as: "deliverableBooked",
        },
      },
      {
        $addFields: {
          bookedValue: {
            $cond: [
              { $gt: [{ $size: "$deliverableBooked" }, 0] },
              { $ifNull: [{ $arrayElemAt: ["$deliverableBooked.booked", 0] }, 0] },
              { $ifNull: ["$totalPrice", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: ["$bookedValue", { $ifNull: ["$advanceReceived", 0] }],
                },
              ],
            },
          },
        },
      },
    ]),
    aggregateRecurringOutstanding(),
    migratedIds.length
      ? Project.aggregate([
          { $match: { _id: { $nin: migratedIds } } },
          {
            $group: {
              _id: null,
              total: { $sum: { $max: [0, { $ifNull: ["$remainingAmount", 0] }] } },
            },
          },
        ])
      : Project.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: { $max: [0, { $ifNull: ["$remainingAmount", 0] }] } },
            },
          },
        ]),
  ]);

  return roundMoney(
    (oneTimeOutstanding[0]?.total || 0) +
      (recurringOutstanding || 0) +
      (projectRows[0]?.total || 0)
  );
}

async function aggregateFreelancerCostsTotal() {
  const fromDues = await aggregateFreelancerCostsFromDues();
  if (fromDues > 0) return roundMoney(fromDues);

  const migratedIds = await getMigratedLegacyProjectIds();
  const match = { isOutsourced: true };
  if (migratedIds.length) match._id = { $nin: migratedIds };

  const legacyRows = await Project.aggregate([{ $match: match }, legacyFreelancerCostPipeline[1]]);
  return roundMoney(legacyRows[0]?.total || 0);
}

/**
 * Cash received this month from:
 * - Client payments (one-time allocations + recurring invoices/wallet)
 * - Direct one-time ServicePayments not created via client payment allocation
 * - Legacy project payments
 */
async function aggregatePaymentsReceivedThisMonth(monthStart) {
  const [clientRows, projectRows, directServiceRows] = await Promise.all([
    ClientPayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    ProjectPayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ServicePayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: monthStart },
          notes: { $not: /Allocated from client payment/i },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return roundMoney(
    (clientRows[0]?.total || 0) +
      (projectRows[0]?.total || 0) +
      (directServiceRows[0]?.total || 0)
  );
}

/**
 * Persist recurring Service.remainingAmount / paymentStatus from open cycle invoices
 * so lists and other readers stay in sync after payments.
 */
async function syncRecurringServiceFinancials(serviceId, session = null) {
  if (!serviceId) return null;

  const query = BillingCycleInvoice.find({ serviceId });
  if (session) query.session(session);
  const invoices = await query.lean();

  let outstanding = 0;
  let collected = 0;
  for (const inv of invoices) {
    collected = roundMoney(
      collected + roundMoney(inv.amountPaid) + roundMoney(inv.creditApplied)
    );
    if (OPEN_RECURRING_INVOICE_STATUSES.includes(inv.status)) {
      outstanding = roundMoney(
        outstanding +
          Math.max(
            0,
            roundMoney(inv.amountDue) - roundMoney(inv.creditApplied) - roundMoney(inv.amountPaid)
          )
      );
    }
  }

  let paymentStatus = "Unpaid";
  if (outstanding <= 0 && collected > 0) paymentStatus = "Paid";
  else if (outstanding > 0 && collected > 0) paymentStatus = "Partial";
  else if (outstanding > 0) paymentStatus = "Unpaid";

  const update = {
    remainingAmount: outstanding,
    advanceReceived: collected,
    paymentStatus,
  };

  if (session) {
    await Service.findByIdAndUpdate(serviceId, update, { session });
  } else {
    await Service.findByIdAndUpdate(serviceId, update);
  }

  return update;
}

async function getSharedFinancialMetrics() {
  const [clientOutstanding, totalRevenue, totalExpenses, freelancerCosts, totalDecree] = await Promise.all([
    aggregateClientOutstanding(),
    aggregateBookedRevenue(),
    aggregateTotalExpenses(),
    aggregateFreelancerCostsTotal(),
    aggregateDecreeExpenses(),
  ]);

  return {
    clientOutstanding,
    pendingPayments: clientOutstanding,
    totalRevenue,
    totalExpenses,
    freelancerCosts,
    totalDecree,
    grossProfit: roundMoney(totalRevenue - freelancerCosts),
    netProfit: roundMoney(totalRevenue - totalExpenses - freelancerCosts),
  };
}

module.exports = {
  getMigratedLegacyProjectIds,
  aggregateBookedRevenue,
  aggregateTotalExpenses,
  aggregateDecreeExpenses,
  aggregateClientOutstanding,
  aggregateRecurringOutstanding,
  aggregateFreelancerCostsTotal,
  aggregatePaymentsReceivedThisMonth,
  syncRecurringServiceFinancials,
  getSharedFinancialMetrics,
  OPEN_RECURRING_INVOICE_STATUSES,
};
