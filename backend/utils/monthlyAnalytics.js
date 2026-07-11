const Project = require("../models/Project");
const Service = require("../models/Service");
const Expense = require("../models/Expense");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const { activeAssignmentFilter } = require("../services/serviceCalculations.service");
const { getMigratedLegacyProjectIds } = require("./financialMetrics");

const last12MonthsRange = () => {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }
  return months;
};

const rowsToMap = (rows) =>
  Object.fromEntries(rows.map((r) => [`${r._id.y}-${r._id.m}`, r.total || 0]));

/** Three aggregations total instead of 36 sequential month queries. */
const buildMonthlyTrends = async (months = last12MonthsRange()) => {
  if (!months.length) return [];

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;
  const migratedIds = await getMigratedLegacyProjectIds();

  const [serviceRevenueRows, projectRevenueRows, expenseRows, freelancerRowsFromAssignments, freelancerRowsLegacy] =
    await Promise.all([
      Service.aggregate([
        {
          $match: {
            billingModel: { $ne: "recurring" },
            dateOfOnboarding: { $gte: rangeStart, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$dateOfOnboarding" }, m: { $month: "$dateOfOnboarding" } },
            total: { $sum: { $ifNull: ["$totalPrice", 0] } },
          },
        },
      ]),
      Project.aggregate([
        {
          $match: {
            ...(migratedIds.length ? { _id: { $nin: migratedIds } } : {}),
            dateOfOnboarding: { $gte: rangeStart, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$dateOfOnboarding" }, m: { $month: "$dateOfOnboarding" } },
            total: { $sum: { $ifNull: ["$totalAmount", 0] } },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: rangeStart, $lte: rangeEnd } } },
        {
          $group: {
            _id: { y: { $year: "$expenseDate" }, m: { $month: "$expenseDate" } },
            total: { $sum: "$amount" },
          },
        },
      ]),
      DeliverableAssignment.aggregate([
        { $match: { ...activeAssignmentFilter, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
        {
          $group: {
            _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
            total: { $sum: { $ifNull: ["$cost", 0] } },
          },
        },
      ]),
      Project.aggregate([
        {
          $match: {
            ...(migratedIds.length ? { _id: { $nin: migratedIds } } : {}),
            isOutsourced: true,
            dateOfOnboarding: { $gte: rangeStart, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$dateOfOnboarding" }, m: { $month: "$dateOfOnboarding" } },
            total: { $sum: { $ifNull: ["$outsourcingCost", 0] } },
          },
        },
      ]),
    ]);

  const mergeRevenueMaps = (a, b) => {
    const merged = { ...a };
    for (const [key, value] of Object.entries(b)) {
      merged[key] = (merged[key] || 0) + value;
    }
    return merged;
  };

  const revMap = mergeRevenueMaps(rowsToMap(serviceRevenueRows), rowsToMap(projectRevenueRows));
  const expMap = rowsToMap(expenseRows);
  const flAssignmentMap = rowsToMap(freelancerRowsFromAssignments);
  const flLegacyMap = rowsToMap(freelancerRowsLegacy);

  return months.map((m) => {
    const key = `${m.year}-${m.month}`;
    const revenue = revMap[key] || 0;
    const expenses = expMap[key] || 0;
    const freelancerCosts = flAssignmentMap[key] || flLegacyMap[key] || 0;
    return {
      label: m.label,
      revenue,
      expenses,
      freelancerCosts,
      profit: revenue - expenses - freelancerCosts,
    };
  });
};

module.exports = { last12MonthsRange, buildMonthlyTrends };
