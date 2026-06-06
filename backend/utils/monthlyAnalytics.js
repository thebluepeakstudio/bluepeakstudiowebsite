const Project = require("../models/Project");
const Expense = require("../models/Expense");
const { recognizedRevenueExpr } = require("./revenue");
const { outsourcedCostMatch } = require("./freelancerCosts");

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

  const [revenueRows, expenseRows, freelancerRows] = await Promise.all([
    Project.aggregate([
      { $match: { dateOfOnboarding: { $gte: rangeStart, $lte: rangeEnd } } },
      {
        $group: {
          _id: { y: { $year: "$dateOfOnboarding" }, m: { $month: "$dateOfOnboarding" } },
          total: { $sum: recognizedRevenueExpr },
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
    Project.aggregate([
      outsourcedCostMatch({ dateOfOnboarding: { $gte: rangeStart, $lte: rangeEnd } }),
      {
        $group: {
          _id: { y: { $year: "$dateOfOnboarding" }, m: { $month: "$dateOfOnboarding" } },
          total: { $sum: { $ifNull: ["$outsourcingCost", 0] } },
        },
      },
    ]),
  ]);

  const revMap = rowsToMap(revenueRows);
  const expMap = rowsToMap(expenseRows);
  const flMap = rowsToMap(freelancerRows);

  return months.map((m) => {
    const key = `${m.year}-${m.month}`;
    const revenue = revMap[key] || 0;
    const expenses = expMap[key] || 0;
    const freelancerCosts = flMap[key] || 0;
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
