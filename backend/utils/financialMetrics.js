const Service = require("../models/Service");
const Project = require("../models/Project");
const Deliverable = require("../models/Deliverable");
const Expense = require("../models/Expense");
const ServicePayment = require("../models/ServicePayment");
const ProjectPayment = require("../models/ProjectPayment");
const { roundMoney } = require("../services/servicePayment.service");
const { activeDeliverableFilter } = require("../services/serviceCalculations.service");
const {
  aggregateFreelancerCosts,
  legacyFreelancerCostPipeline,
} = require("./freelancerCosts");

/** Legacy projects already represented as Service rows (avoid double-counting). */
async function getMigratedLegacyProjectIds() {
  const rows = await Service.find({ legacyProjectId: { $ne: null } })
    .select("legacyProjectId")
    .lean();
  return rows.map((r) => r.legacyProjectId);
}

/**
 * Booked revenue: one-time project values + recurring cash received to date.
 * Aligns company P&L with per-project value (e.g. ₹14,700 project − ₹2,700 freelancer = ₹12,000 gross).
 */
async function aggregateBookedRevenue() {
  const migratedIds = await getMigratedLegacyProjectIds();

  const [deliverableRevenue, serviceOnlyRevenue, projectLegacy, serviceRecurring] =
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
      Service.aggregate([
        { $match: { billingModel: "recurring" } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$advanceReceived", 0] } } } },
      ]),
    ]);

  return roundMoney(
    (deliverableRevenue[0]?.total || 0) +
      (serviceOnlyRevenue[0]?.total || 0) +
      (projectLegacy[0]?.total || 0) +
      (serviceRecurring[0]?.total || 0)
  );
}

async function aggregateTotalExpenses() {
  const rows = await Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
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
    Service.aggregate([
      { $match: { billingModel: "recurring" } },
      {
        $group: {
          _id: null,
          total: { $sum: { $max: [0, { $ifNull: ["$remainingAmount", 0] }] } },
        },
      },
    ]),
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
      (recurringOutstanding[0]?.total || 0) +
      (projectRows[0]?.total || 0)
  );
}

async function aggregateFreelancerCostsTotal() {
  const assignmentTotal = await aggregateFreelancerCosts();
  if (assignmentTotal > 0) return roundMoney(assignmentTotal);

  const migratedIds = await getMigratedLegacyProjectIds();
  const match = { isOutsourced: true };
  if (migratedIds.length) match._id = { $nin: migratedIds };

  const legacyRows = await Project.aggregate([{ $match: match }, legacyFreelancerCostPipeline[1]]);
  return roundMoney(legacyRows[0]?.total || 0);
}

async function aggregatePaymentsReceivedThisMonth(monthStart) {
  const [serviceRows, projectRows] = await Promise.all([
    ServicePayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ProjectPayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return roundMoney((serviceRows[0]?.total || 0) + (projectRows[0]?.total || 0));
}

async function getSharedFinancialMetrics() {
  const [clientOutstanding, totalRevenue, totalExpenses, freelancerCosts] = await Promise.all([
    aggregateClientOutstanding(),
    aggregateBookedRevenue(),
    aggregateTotalExpenses(),
    aggregateFreelancerCostsTotal(),
  ]);

  return {
    clientOutstanding,
    pendingPayments: clientOutstanding,
    totalRevenue,
    totalExpenses,
    freelancerCosts,
    grossProfit: roundMoney(totalRevenue - freelancerCosts),
    netProfit: roundMoney(totalRevenue - totalExpenses - freelancerCosts),
  };
}

module.exports = {
  getMigratedLegacyProjectIds,
  aggregateBookedRevenue,
  aggregateTotalExpenses,
  aggregateClientOutstanding,
  aggregateFreelancerCostsTotal,
  aggregatePaymentsReceivedThisMonth,
  getSharedFinancialMetrics,
};
