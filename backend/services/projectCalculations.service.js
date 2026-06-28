const mongoose = require("mongoose");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const Expense = require("../models/Expense");

const activeDeliverableFilter = { deletedAt: null };
const activeAssignmentFilter = { deletedAt: null };

const deriveOverallStatus = (deliverables) => {
  const active = deliverables.filter((d) => d.status !== "Cancelled");
  if (!active.length) return "Not Started";

  const statuses = active.map((d) => d.status);
  if (statuses.every((s) => s === "Delivered")) return "Delivered";
  if (statuses.every((s) => s === "Not Started")) return "Not Started";

  const priority = [
    "In Progress",
    "Review",
    "Waiting For Client",
    "Not Started",
    "Delivered",
  ];
  for (const status of priority) {
    if (statuses.includes(status)) return status === "Waiting For Client" ? "Waiting for Client" : status;
  }
  return "In Progress";
};

const averageDeliverableProgress = (deliverables) => {
  const active = deliverables.filter((d) => d.status !== "Cancelled");
  if (!active.length) return 0;
  const sum = active.reduce((acc, d) => acc + (Number(d.progress) || 0), 0);
  return Math.round(sum / active.length);
};

const sumDeliverablePrices = (deliverables) =>
  deliverables
    .filter((d) => d.status !== "Cancelled")
    .reduce((sum, d) => sum + (Number(d.sellingPrice) || 0), 0);

const assignmentCostTotal = (assignments) =>
  assignments.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

const deliverableProfit = (deliverable, assignments = []) => {
  const price = Number(deliverable.sellingPrice) || 0;
  const cost = assignmentCostTotal(assignments);
  return price - cost;
};

const getDeliverablesForProject = async (projectId, session = null) => {
  const query = ProjectDeliverable.find({ projectId, ...activeDeliverableFilter }).sort({
    createdAt: 1,
  });
  if (session) query.session(session);
  return query.lean();
};

const getAssignmentsForDeliverables = async (deliverableIds, session = null) => {
  if (!deliverableIds.length) return [];
  const query = DeliverableAssignment.find({
    deliverableId: { $in: deliverableIds },
    ...activeAssignmentFilter,
  }).populate("freelancerId", "name email contactNumber skills");
  if (session) query.session(session);
  return query.lean();
};

const getProjectExpensesTotal = async (projectId) => {
  const id = typeof projectId === "string" ? new mongoose.Types.ObjectId(projectId) : projectId;
  const rows = await Expense.aggregate([
    { $match: { projectId: id } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return rows[0]?.total || 0;
};

const computeProjectProfit = async (projectId, deliverables, assignmentsByDeliverable) => {
  let deliverableProfitTotal = 0;
  for (const d of deliverables) {
    const assignments = assignmentsByDeliverable[d._id.toString()] || [];
    deliverableProfitTotal += deliverableProfit(d, assignments);
  }
  const expenseTotal = await getProjectExpensesTotal(projectId);
  return deliverableProfitTotal - expenseTotal;
};

const buildServicesSummary = (deliverables) => {
  const active = deliverables.filter((d) => d.status !== "Cancelled");
  return {
    services: active.slice(0, 3).map((d) => d.title),
    servicesCount: active.length,
    categories: [...new Set(active.map((d) => d.category))],
  };
};

module.exports = {
  activeDeliverableFilter,
  activeAssignmentFilter,
  deriveOverallStatus,
  averageDeliverableProgress,
  sumDeliverablePrices,
  assignmentCostTotal,
  deliverableProfit,
  getDeliverablesForProject,
  getAssignmentsForDeliverables,
  getProjectExpensesTotal,
  computeProjectProfit,
  buildServicesSummary,
};
