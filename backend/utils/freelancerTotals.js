const mongoose = require("mongoose");
const Project = require("../models/Project");

const assignmentStatsPipeline = (freelancerMatch) => [
  { $match: { isOutsourced: true } },
  {
    $addFields: {
      _assignments: {
        $cond: [
          { $gt: [{ $size: { $ifNull: ["$assignedFreelancers", []] } }, 0] },
          "$assignedFreelancers",
          {
            $cond: [
              { $ifNull: ["$freelancerId", false] },
              [
                {
                  freelancerId: "$freelancerId",
                  outsourcingCost: { $ifNull: ["$outsourcingCost", 0] },
                  amountPaidToFreelancer: { $ifNull: ["$amountPaidToFreelancer", 0] },
                },
              ],
              [],
            ],
          },
        ],
      },
    },
  },
  { $unwind: "$_assignments" },
  { $match: freelancerMatch },
  {
    $group: {
      _id: "$_assignments.freelancerId",
      totalOwed: { $sum: { $ifNull: ["$_assignments.outsourcingCost", 0] } },
      totalPaid: { $sum: { $ifNull: ["$_assignments.amountPaidToFreelancer", 0] } },
      projectCount: { $addToSet: "$_id" },
    },
  },
  {
    $project: {
      totalOwed: 1,
      totalPaid: 1,
      projectCount: { $size: "$projectCount" },
    },
  },
];

const getFinancialsForFreelancer = async (freelancerId) => {
  const id = new mongoose.Types.ObjectId(freelancerId);
  const rows = await Project.aggregate(
    assignmentStatsPipeline({ "_assignments.freelancerId": id })
  );

  const totalOwed = rows[0]?.totalOwed || 0;
  const totalPaid = rows[0]?.totalPaid || 0;

  return {
    totalOwed,
    totalPaid,
    amountDue: Math.max(0, totalOwed - totalPaid),
    outsourcedProjects: rows[0]?.projectCount || 0,
  };
};

const attachFinancialsToList = async (freelancers) => {
  if (!freelancers.length) return [];

  const ids = freelancers.map((f) => f._id);
  const rows = await Project.aggregate(
    assignmentStatsPipeline({ "_assignments.freelancerId": { $in: ids } })
  );

  const owedMap = Object.fromEntries(rows.map((r) => [r._id.toString(), r]));
  return freelancers.map((f) => {
    const doc = typeof f.toObject === "function" ? f.toObject() : { ...f };
    const stats = owedMap[f._id.toString()] || { totalOwed: 0, totalPaid: 0 };
    const totalOwed = stats.totalOwed || 0;
    const totalPaid = stats.totalPaid || 0;
    return {
      ...doc,
      totalOwed,
      totalPaid,
      amountDue: Math.max(0, totalOwed - totalPaid),
    };
  });
};

module.exports = { getFinancialsForFreelancer, attachFinancialsToList };
