const Project = require("../../models/Project");
const Expense = require("../../models/Expense");
const Freelancer = require("../../models/Freelancer");
const asyncHandler = require("../../utils/asyncHandler");
const { get, set, invalidatePrefix } = require("../../utils/responseCache");
const { sumRecognizedRevenue, sumRecognizedRevenueByField } = require("../../utils/revenue");
const { sumOutsourcingCost, outsourcedCostMatch } = require("../../utils/freelancerCosts");
const { last12MonthsRange, buildMonthlyTrends } = require("../../utils/monthlyAnalytics");

const getDashboard = asyncHandler(async (req, res) => {
  const cacheKey = "analytics:dashboard";
  const cached = get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const months = last12MonthsRange();

  const [
    activeProjects,
    completedProjects,
    partialPaymentProjects,
    pendingPaymentsAgg,
    revenueAgg,
    expenseAgg,
    freelancerCostAgg,
    freelancerCount,
    latestProjects,
    workStatusDist,
    serviceDist,
    expenseByCategory,
    monthlyTrends,
  ] = await Promise.all([
    Project.countDocuments({ workStatus: { $nin: ["Completed", "Delivered"] } }),
    Project.countDocuments({ workStatus: { $in: ["Completed", "Delivered"] } }),
    Project.countDocuments({ paymentStatus: "Partial" }),
    Project.aggregate([
      { $match: { paymentStatus: { $ne: "Paid" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]),
    Project.aggregate([sumRecognizedRevenue]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Project.aggregate([outsourcedCostMatch(), sumOutsourcingCost]),
    Freelancer.countDocuments(),
    Project.find()
      .select("clientName businessName projectType workStatus paymentStatus totalAmount remainingAmount createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Project.aggregate([{ $group: { _id: "$workStatus", count: { $sum: 1 } } }]),
    Project.aggregate([
      sumRecognizedRevenueByField("projectType"),
      { $project: { _id: 1, revenue: 1, count: 1 } },
    ]),
    Expense.aggregate([
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]),
    buildMonthlyTrends(months),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;
  const totalExpenses = expenseAgg[0]?.total || 0;
  const freelancerCosts = freelancerCostAgg[0]?.total || 0;
  const pendingPayments = pendingPaymentsAgg[0]?.total || 0;

  const monthlyRevenue = monthlyTrends.map((m) => ({ name: m.label, value: m.revenue }));
  const monthlyExpenses = monthlyTrends.map((m) => ({ name: m.label, value: m.expenses }));
  const monthlyProfit = monthlyTrends.map((m) => ({
    name: m.label,
    revenue: m.revenue,
    expenses: m.expenses,
    freelancerCosts: m.freelancerCosts,
    profit: m.profit,
  }));

  const payload = {
    success: true,
    data: {
      cards: {
        activeProjects,
        completedProjects,
        partialPaymentProjects,
        pendingPayments,
        totalRevenue,
        totalExpenses,
        freelancerCosts,
        netProfit: totalRevenue - totalExpenses - freelancerCosts,
        totalFreelancers: freelancerCount,
      },
      latestProjects,
      workStatusDist,
      serviceDist,
      expenseByCategory,
      monthlyRevenue,
      monthlyExpenses,
      monthlyProfit,
    },
  };

  set(cacheKey, payload);
  res.json(payload);
});

const getPL = asyncHandler(async (req, res) => {
  const cacheKey = "analytics:pl";
  const cached = get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const months = last12MonthsRange();

  const [revenue, expenses, pending, freelancerCosts, monthlyTrends, serviceRevenue] =
    await Promise.all([
      Project.aggregate([sumRecognizedRevenue]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Project.aggregate([
        { $match: { paymentStatus: { $ne: "Paid" } } },
        { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
      ]),
      Project.aggregate([outsourcedCostMatch(), sumOutsourcingCost]),
      buildMonthlyTrends(months),
      Project.aggregate([sumRecognizedRevenueByField("projectType"), { $sort: { revenue: -1 } }]),
    ]);

  const totalRevenue = revenue[0]?.total || 0;
  const totalExpenses = expenses[0]?.total || 0;
  const freelancerCostsTotal = freelancerCosts[0]?.total || 0;
  const grossProfit = totalRevenue - freelancerCostsTotal;
  const netProfit = totalRevenue - totalExpenses - freelancerCostsTotal;

  const monthly = monthlyTrends.map((m) => ({
    month: m.label,
    revenue: m.revenue,
    expenses: m.expenses,
    freelancerCosts: m.freelancerCosts,
    profit: m.profit,
  }));

  const payload = {
    success: true,
    data: {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit,
      pendingPayments: pending[0]?.total || 0,
      freelancerCosts: freelancerCostsTotal,
      monthly,
      serviceRevenue,
    },
  };

  set(cacheKey, payload);
  res.json(payload);
});

const globalSearch = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) {
    return res.json({ success: true, data: { projects: [], freelancers: [], expenses: [] } });
  }

  const regex = { $regex: q, $options: "i" };
  const [projects, freelancers, expenses] = await Promise.all([
    Project.find({
      $or: [{ clientName: regex }, { projectTitle: regex }, { businessName: regex }],
    })
      .select("projectTitle clientName workStatus paymentStatus")
      .limit(10)
      .lean(),
    Freelancer.find({ $or: [{ name: regex }, { email: regex }] })
      .select("name email availabilityStatus")
      .limit(10)
      .lean(),
    Expense.find({ title: regex }).select("title amount category expenseDate").limit(10).lean(),
  ]);

  res.json({ success: true, data: { projects, freelancers, expenses } });
});

module.exports = { getDashboard, getPL, globalSearch, invalidateAnalyticsCache: () => invalidatePrefix("analytics:") };
