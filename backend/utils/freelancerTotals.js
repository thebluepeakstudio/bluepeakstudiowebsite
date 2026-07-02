const mongoose = require("mongoose");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const Project = require("../models/Project");
const { activeAssignmentFilter } = require("../services/projectCalculations.service");
const {
  findAssignmentForFreelancer,
} = require("./projectFreelancerAssignments");

const assignmentStatsPipeline = (freelancerMatch) => [
  { $match: { ...activeAssignmentFilter } },
  {
    $lookup: {
      from: "projectdeliverables",
      localField: "deliverableId",
      foreignField: "_id",
      as: "deliverable",
    },
  },
  { $unwind: "$deliverable" },
  { $match: { "deliverable.deletedAt": null } },
  {
    $lookup: {
      from: "projects",
      localField: "deliverable.projectId",
      foreignField: "_id",
      as: "project",
    },
  },
  { $unwind: "$project" },
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
  const map = await legacyStatsForFreelancers([freelancerId]);
  return map[freelancerId.toString()] || { totalOwed: 0, totalPaid: 0, assignmentCount: 0 };
};

/** One project query for all freelancers missing assignment-based stats. */
const legacyStatsForFreelancers = async (freelancerIds) => {
  const statsMap = Object.fromEntries(
    freelancerIds.map((id) => [
      id.toString(),
      { totalOwed: 0, totalPaid: 0, assignmentCount: 0 },
    ])
  );
  if (!freelancerIds.length) return statsMap;

  const ids = freelancerIds.map((id) => new mongoose.Types.ObjectId(id));
  const projects = await Project.find({
    isOutsourced: true,
    $or: [
      { "assignedFreelancers.freelancerId": { $in: ids } },
      { freelancerId: { $in: ids } },
    ],
  }).lean();

  for (const p of projects) {
    for (const freelancerId of freelancerIds) {
      const assignment = findAssignmentForFreelancer(p, freelancerId);
      if (!assignment) continue;
      const key = freelancerId.toString();
      statsMap[key].totalOwed += Number(assignment.outsourcingCost) || 0;
      statsMap[key].totalPaid += Number(assignment.amountPaidToFreelancer) || 0;
      statsMap[key].assignmentCount += 1;
    }
  }
  return statsMap;
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

  const missingLegacy = freelancers.filter((f) => !owedMap[f._id.toString()]);
  const legacyMap =
    missingLegacy.length > 0
      ? await legacyStatsForFreelancers(missingLegacy.map((f) => f._id))
      : {};

  const result = [];
  for (const f of freelancers) {
    const doc = typeof f.toObject === "function" ? f.toObject() : { ...f };
    let stats = owedMap[f._id.toString()];
    if (!stats) {
      const legacy = legacyMap[f._id.toString()] || {
        totalOwed: 0,
        totalPaid: 0,
      };
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
