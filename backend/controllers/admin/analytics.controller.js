const Project = require("../../models/Project");
const ProjectDeliverable = require("../../models/ProjectDeliverable");
const ProjectPayment = require("../../models/ProjectPayment");
const Expense = require("../../models/Expense");
const Freelancer = require("../../models/Freelancer");
const DeliverableAssignment = require("../../models/DeliverableAssignment");
const FreelancerPayment = require("../../models/FreelancerPayment");
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
const { computeLeadMetrics } = require("../../utils/leadMetrics");

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
  const leadMetrics = await computeLeadMetrics();
  const cached = get(cacheKey);
  if (cached) {
    return res.json({
      ...cached,
      data: { ...cached.data, leadMetrics },
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeProjects,
    completedProjects,
    waitingForClientProjects,
    partialPaymentProjects,
    pendingPaymentsAgg,
    revenueAgg,
    expenseAgg,
    freelancerCostFromAssignments,
    freelancerCostLegacy,
    freelancerCount,
    latestProjects,
    deliverableStats,
    paymentsThisMonth,
    freelancerPendingAgg,
    freelancerPaidThisMonth,
  ] = await Promise.all([
    Project.countDocuments({ workStatus: { $nin: ["Completed", "Delivered"] } }),
    Project.countDocuments({ workStatus: { $in: ["Completed", "Delivered"] } }),
    Project.countDocuments({ workStatus: "Waiting for Client" }),
    Project.countDocuments({ paymentStatus: "Partial" }),
    Project.aggregate([
      { $match: { paymentStatus: { $ne: "Paid" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]),
    Project.aggregate([sumRecognizedRevenue]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    aggregateFreelancerCosts(),
    Project.aggregate(legacyFreelancerCostPipeline),
    Freelancer.countDocuments(),
    Project.find()
      .select(
        "clientName businessName projectTitle projectType workStatus paymentStatus totalAmount remainingAmount createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    ProjectDeliverable.aggregate([
      { $match: activeDeliverableFilter },
      {
        $group: {
          _id: null,
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ["$status", "Review"] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] } },
          delayed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$expectedCompletion", now] },
                    { $ne: ["$status", "Delivered"] },
                    { $ne: ["$status", "Cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    ProjectPayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    DeliverableAssignment.aggregate([
      { $match: { deletedAt: null } },
      {
        $project: {
          due: { $subtract: [{ $ifNull: ["$cost", 0] }, { $ifNull: ["$amountPaid", 0] }] },
        },
      },
      { $match: { due: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$due" } } },
    ]),
    FreelancerPayment.aggregate([
      { $match: { paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;
  const totalExpenses = expenseAgg[0]?.total || 0;
  const freelancerCosts =
    freelancerCostFromAssignments || freelancerCostLegacy[0]?.total || 0;
  const pendingPayments = pendingPaymentsAgg[0]?.total || 0;

  const enrichedLatestProjects = await enrichLatestProjects(latestProjects);

  const payload = {
    success: true,
    data: {
      cards: {
        activeProjects,
        completedProjects,
        waitingForClientProjects,
        partialPaymentProjects,
        pendingPayments,
        totalRevenue,
        totalExpenses,
        freelancerCosts,
        netProfit: totalRevenue - totalExpenses - freelancerCosts,
        totalFreelancers: freelancerCount,
        deliverables: deliverableStats[0] || {
          inProgress: 0,
          review: 0,
          delivered: 0,
          delayed: 0,
        },
        paymentsReceivedThisMonth: paymentsThisMonth[0]?.total || 0,
        freelancerPendingPayments: freelancerPendingAgg[0]?.total || 0,
        freelancerPaidThisMonth: freelancerPaidThisMonth[0]?.total || 0,
      },
      latestProjects: enrichedLatestProjects,
      leadMetrics,
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

  const [revenue, expenses, pending, freelancerCostsNew, freelancerCostsLegacy] = await Promise.all([
    Project.aggregate([sumRecognizedRevenue]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    Project.aggregate([
      { $match: { paymentStatus: { $ne: "Paid" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]),
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
      pendingPayments: pending[0]?.total || 0,
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
