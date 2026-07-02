const Project = require("../models/Project");

/** Sum of max(0, totalAmount - advanceReceived) across all projects. */
const clientOutstandingPipeline = [
  {
    $project: {
      outstanding: {
        $max: [
          0,
          {
            $subtract: [
              { $ifNull: ["$totalAmount", 0] },
              { $ifNull: ["$advanceReceived", 0] },
            ],
          },
        ],
      },
    },
  },
  { $match: { outstanding: { $gt: 0 } } },
  { $group: { _id: null, total: { $sum: "$outstanding" } } },
];

const aggregateClientOutstanding = async () => {
  const rows = await Project.aggregate(clientOutstandingPipeline);
  return Math.round((rows[0]?.total || 0) * 100) / 100;
};

module.exports = {
  clientOutstandingPipeline,
  aggregateClientOutstanding,
};
