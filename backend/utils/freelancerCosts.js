const DeliverableAssignment = require("../models/DeliverableAssignment");
const { activeAssignmentFilter } = require("../services/serviceCalculations.service");

/** Sum committed freelancer cost from deliverable assignments. */
const sumOutsourcingCost = {
  $group: {
    _id: null,
    total: { $sum: { $ifNull: ["$cost", 0] } },
  },
};

const outsourcedCostMatch = (extra = {}) => ({
  $match: { ...activeAssignmentFilter, ...extra },
});

const aggregateFreelancerCosts = async (match = {}) => {
  const rows = await DeliverableAssignment.aggregate([
    outsourcedCostMatch(match),
    sumOutsourcingCost,
  ]);
  return rows[0]?.total || 0;
};

const legacyFreelancerCostPipeline = [
  { $match: { isOutsourced: true } },
  {
    $group: {
      _id: null,
      total: { $sum: { $ifNull: ["$outsourcingCost", 0] } },
    },
  },
];

module.exports = {
  sumOutsourcingCost,
  outsourcedCostMatch,
  aggregateFreelancerCosts,
  legacyFreelancerCostPipeline,
};
