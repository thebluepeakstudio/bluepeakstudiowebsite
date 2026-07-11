const mongoose = require("mongoose");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const Project = require("../models/Project");
const { activeAssignmentFilter } = require("../services/serviceCalculations.service");
const { fetchDeliverablesByIds } = require("./resolveDeliverableRecords");
const {
  findAssignmentForFreelancer,
} = require("./projectFreelancerAssignments");

const aggregateAssignmentStats = async (freelancerIds) => {
  const ids = freelancerIds.map((id) => new mongoose.Types.ObjectId(id));
  const assignments = await DeliverableAssignment.find({
    freelancerId: { $in: ids },
    ...activeAssignmentFilter,
  }).lean();

  if (!assignments.length) return {};

  const deliverableMap = await fetchDeliverablesByIds(
    assignments.map((a) => a.deliverableId)
  );

  const statsMap = Object.fromEntries(
    freelancerIds.map((id) => [
      id.toString(),
      { totalOwed: 0, totalPaid: 0, assignmentCount: 0 },
    ])
  );

  for (const assignment of assignments) {
    const deliverable = deliverableMap[assignment.deliverableId?.toString()];
    if (!deliverable?.ownerId) continue;

    const key = assignment.freelancerId.toString();
    if (!statsMap[key]) continue;

    statsMap[key].totalOwed += Number(assignment.cost) || 0;
    statsMap[key].totalPaid += Number(assignment.amountPaid) || 0;
    statsMap[key].assignmentCount += 1;
  }

  return statsMap;
};

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
  const statsMap = await aggregateAssignmentStats([freelancerId]);
  const stats = statsMap[freelancerId.toString()];

  if (stats?.assignmentCount > 0) {
    const totalOwed = stats.totalOwed || 0;
    const totalPaid = stats.totalPaid || 0;
    return {
      totalOwed,
      totalPaid,
      amountDue: Math.max(0, totalOwed - totalPaid),
      outsourcedProjects: stats.assignmentCount || 0,
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
  const statsMap = await aggregateAssignmentStats(ids);

  const missingLegacy = freelancers.filter(
    (f) => !(statsMap[f._id.toString()]?.assignmentCount > 0)
  );
  const legacyMap =
    missingLegacy.length > 0
      ? await legacyStatsForFreelancers(missingLegacy.map((f) => f._id))
      : {};

  const result = [];
  for (const f of freelancers) {
    const doc = typeof f.toObject === "function" ? f.toObject() : { ...f };
    let stats = statsMap[f._id.toString()];
    if (!stats?.assignmentCount) {
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
