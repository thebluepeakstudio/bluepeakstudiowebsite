const Project = require("../../models/Project");
const ProjectDeliverable = require("../../models/ProjectDeliverable");
const ProjectPayment = require("../../models/ProjectPayment");
const Expense = require("../../models/Expense");
const Freelancer = require("../../models/Freelancer");
const asyncHandler = require("../../utils/asyncHandler");
const { get, set, invalidatePrefix } = require("../../utils/responseCache");
const { sumRecognizedRevenue } = require("../../utils/revenue");
const {
  aggregateFreelancerCosts,
  legacyFreelancerCostPipeline,
} = require("../../utils/freelancerCosts");
const {
  activeDeliverableFilter,
  buildServicesSummary,
  groupDeliverablesByProject,
} = require("../../services/projectCalculations.service");
const { aggregateClientOutstanding } = require("../../utils/clientOutstanding");

const enrichLatestProjects = async (projects) => {
  if (!projects.length) return [];
  const ids = projects.map((p) => p._id);
  const deliverables = await ProjectDeliverable.find({
    projectId: { $in: ids },
    ...activeDeliverableFilter,
  })
    .select("projectId title status category")
    .lean();

  const byProject = groupDeliverablesByProject(deliverables);

  return projects.map((p) => {
    const list = byProject[p._id.toString()] || [];
    if (list.length) {
      return {
        ...p,
        ...buildServicesSummary(list),
      };
    }
    return {
      ...p,
      services: p.projectType ? [p.projectType] : [],
      servicesCount: p.projectType ? 1 : 0,
    };
  });
};

const getDashboard = asyncHandler(async (req, res) => {
  const cacheKey = "analytics:dashboard";
  const cached = get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeProjects,
    pendingPayments,
    revenueAgg,
    expenseAgg,
    freelancerCostFromAssignments,
    freelancerCostLegacy,
    latestProjects,
    paymentsThisMonth,
  ] = await Promise.all([
    Project.countDocuments({ workStatus: { $nin: ["Completed", "Delivered"] } }),
    aggregateClientOutstanding(),
    Project.aggregate([sumRecognizedRevenue]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    aggregateFreelancerCosts(),
    Project.aggregate(legacyFreelancerCostPipeline),
    Project.find()
      .select(
        "clientName businessName projectTitle projectType workStatus paymentStatus totalAmount remainingAmount createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    ProjectPayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;
  const totalExpenses = expenseAgg[0]?.total || 0;
  const freelancerCosts =
    freelancerCostFromAssignments || freelancerCostLegacy[0]?.total || 0;

  const enrichedLatestProjects = await enrichLatestProjects(latestProjects);

  const payload = {
    success: true,
    data: {
      cards: {
        activeProjects,
        pendingPayments,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses - freelancerCosts,
        paymentsReceivedThisMonth: paymentsThisMonth[0]?.total || 0,
      },
      latestProjects: enrichedLatestProjects,
    },
  };

  set(cacheKey, payload, 120_000);
  res.json(payload);
});

const getPL = asyncHandler(async (req, res) => {
  const cacheKey = "analytics:pl";
  const cached = get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const [revenue, expenses, pendingPayments, freelancerCostsNew, freelancerCostsLegacy] =
    await Promise.all([
      Project.aggregate([sumRecognizedRevenue]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      aggregateClientOutstanding(),
      aggregateFreelancerCosts(),
      Project.aggregate(legacyFreelancerCostPipeline),
    ]);

  const totalRevenue = revenue[0]?.total || 0;
  const totalExpenses = expenses[0]?.total || 0;
  const freelancerCostsTotal = freelancerCostsNew || freelancerCostsLegacy[0]?.total || 0;
  const grossProfit = totalRevenue - freelancerCostsTotal;
  const netProfit = totalRevenue - totalExpenses - freelancerCostsTotal;

  const payload = {
    success: true,
    data: {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit,
      pendingPayments,
      freelancerCosts: freelancerCostsTotal,
    },
  };

  set(cacheKey, payload, 120_000);
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
