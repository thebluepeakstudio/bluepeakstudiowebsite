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

const groupDeliverablesByProject = (deliverables) => {
  const byProject = {};
  for (const d of deliverables) {
    const key = d.projectId.toString();
    if (!byProject[key]) byProject[key] = [];
    byProject[key].push(d);
  }
  return byProject;
};

const enrichProjectWithDeliverables = (project, deliverableList = []) => {
  const doc = typeof project.toObject === "function" ? project.toObject() : { ...project };

  if (deliverableList.length) {
    return {
      ...doc,
      ...buildServicesSummary(deliverableList),
      overallStatus: doc.workStatus,
      projectName: doc.projectTitle || doc.clientName,
    };
  }

  return {
    ...doc,
    services: doc.projectType ? [doc.projectType] : [],
    servicesCount: doc.projectType ? 1 : 0,
    categories: doc.projectType ? [doc.projectType] : [],
    overallStatus: doc.workStatus,
    projectName: doc.projectTitle || doc.clientName,
  };
};

/** Single query for all projects on a page — avoids N+1 deliverable lookups. */
const enrichProjectsWithDeliverables = async (projects) => {
  if (!projects.length) return [];

  const ids = projects.map((p) => p._id);
  const deliverables = await ProjectDeliverable.find({
    projectId: { $in: ids },
    ...activeDeliverableFilter,
  })
    .select("projectId title category status sellingPrice")
    .sort({ createdAt: 1 })
    .lean();

  const byProject = groupDeliverablesByProject(deliverables);
  return projects.map((p) =>
    enrichProjectWithDeliverables(p, byProject[p._id.toString()] || [])
  );
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
  groupDeliverablesByProject,
  enrichProjectWithDeliverables,
  enrichProjectsWithDeliverables,
};
