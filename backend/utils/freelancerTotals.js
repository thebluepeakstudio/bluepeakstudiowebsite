const mongoose = require("mongoose");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const Project = require("../models/Project");
const { activeAssignmentFilter } = require("../services/projectCalculations.service");
const {
  findAssignmentForFreelancer,
  normalizeAssignedFreelancers,
} = require("./projectFreelancerAssignments");

const assignmentStatsPipeline = (freelancerMatch) => [
  { $match: { ...activeAssignmentFilter } },
  {
    $group: {
      _id: "$freelancerId",
      totalOwed: { $sum: { $ifNull: ["$cost", 0] } },
      totalPaid: { $sum: { $ifNull: ["$amountPaid", 0] } },
      assignmentCount: { $addToSet: "$_id" },
    },
  },
  { $match: freelancerMatch },
  {
    $project: {
      totalOwed: 1,
      totalPaid: 1,
      assignmentCount: { $size: "$assignmentCount" },
    },
  },
];

const legacyStatsForFreelancer = async (freelancerId) => {
  const id = new mongoose.Types.ObjectId(freelancerId);
  const projects = await Project.find({
    isOutsourced: true,
    $or: [{ "assignedFreelancers.freelancerId": id }, { freelancerId: id }],
  }).lean();

  let totalOwed = 0;
  let totalPaid = 0;
  let count = 0;
  for (const p of projects) {
    const assignment = findAssignmentForFreelancer(p, freelancerId);
    if (!assignment) continue;
    totalOwed += Number(assignment.outsourcingCost) || 0;
    totalPaid += Number(assignment.amountPaidToFreelancer) || 0;
    count += 1;
  }
  return { totalOwed, totalPaid, assignmentCount: count };
};

const getFinancialsForFreelancer = async (freelancerId) => {
  const id = new mongoose.Types.ObjectId(freelancerId);
  const rows = await DeliverableAssignment.aggregate(
    assignmentStatsPipeline({ _id: id })
  );

  if (rows.length) {
    const totalOwed = rows[0]?.totalOwed || 0;
    const totalPaid = rows[0]?.totalPaid || 0;
    return {
      totalOwed,
      totalPaid,
      amountDue: Math.max(0, totalOwed - totalPaid),
      outsourcedProjects: rows[0]?.assignmentCount || 0,
    };
  }

  const legacy = await legacyStatsForFreelancer(freelancerId);
  return {
    totalOwed: legacy.totalOwed,
    totalPaid: legacy.totalPaid,
    amountDue: Math.max(0, legacy.totalOwed - legacy.totalPaid),
    outsourcedProjects: legacy.assignmentCount,
  };
};

const attachFinancialsToList = async (freelancers) => {
  if (!freelancers.length) return [];

  const ids = freelancers.map((f) => f._id);
  const rows = await DeliverableAssignment.aggregate(
    assignmentStatsPipeline({ _id: { $in: ids } })
  );

  const owedMap = Object.fromEntries(rows.map((r) => [r._id.toString(), r]));

  const result = [];
  for (const f of freelancers) {
    const doc = typeof f.toObject === "function" ? f.toObject() : { ...f };
    let stats = owedMap[f._id.toString()];
    if (!stats) {
      const legacy = await legacyStatsForFreelancer(f._id);
      stats = {
        totalOwed: legacy.totalOwed,
        totalPaid: legacy.totalPaid,
      };
    }
    const totalOwed = stats.totalOwed || 0;
    const totalPaid = stats.totalPaid || 0;
    result.push({
      ...doc,
      totalOwed,
      totalPaid,
      amountDue: Math.max(0, totalOwed - totalPaid),
    });
  }
  return result;
};

module.exports = { getFinancialsForFreelancer, attachFinancialsToList };
