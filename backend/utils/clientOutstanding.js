const Project = require("../models/Project");

/**
 * Total client balance still owed — sums each project's remainingAmount
 * (kept in sync with the payment ledger via recomputeProjectPaymentSummary).
 */
const clientOutstandingPipeline = [
  {
    $group: {
      _id: null,
      total: {
        $sum: {
          $max: [0, { $ifNull: ["$remainingAmount", 0] }],
        },
      },
    },
  },
];

const aggregateClientOutstanding = async () => {
  const rows = await Project.aggregate(clientOutstandingPipeline);
  return Math.round((rows[0]?.total || 0) * 100) / 100;
};

module.exports = {
  clientOutstandingPipeline,
  aggregateClientOutstanding,
};
