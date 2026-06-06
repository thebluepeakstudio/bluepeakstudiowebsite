const mongoose = require("mongoose");
const Project = require("../models/Project");

const getFinancialsForFreelancer = async (freelancerId) => {
  const id = new mongoose.Types.ObjectId(freelancerId);

  const projectStats = await Project.aggregate([
    { $match: { freelancerId: id, isOutsourced: true } },
    {
      $group: {
        _id: null,
        totalOwed: { $sum: { $ifNull: ["$outsourcingCost", 0] } },
        totalPaid: { $sum: { $ifNull: ["$amountPaidToFreelancer", 0] } },
        projectCount: { $sum: 1 },
      },
    },
  ]);

  const totalOwed = projectStats[0]?.totalOwed || 0;
  const totalPaid = projectStats[0]?.totalPaid || 0;
  const amountDue = Math.max(0, totalOwed - totalPaid);

  return {
    totalOwed,
    totalPaid,
    amountDue,
    outsourcedProjects: projectStats[0]?.projectCount || 0,
  };
};

const attachFinancialsToList = async (freelancers) => {
  if (!freelancers.length) return [];

  const ids = freelancers.map((f) => f._id);

  const owedRows = await Project.aggregate([
    { $match: { freelancerId: { $in: ids }, isOutsourced: true } },
    {
      $group: {
        _id: "$freelancerId",
        totalOwed: { $sum: { $ifNull: ["$outsourcingCost", 0] } },
        totalPaid: { $sum: { $ifNull: ["$amountPaidToFreelancer", 0] } },
      },
    },
  ]);

  const owedMap = Object.fromEntries(owedRows.map((r) => [r._id.toString(), r]));
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
