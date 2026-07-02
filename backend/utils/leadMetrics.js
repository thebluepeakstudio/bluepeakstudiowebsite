const Lead = require("../models/Lead");
const { LEAD_STAGES } = require("../models/Lead");

const computeLeadMetrics = async () => {
  const openStatuses = LEAD_STAGES.filter((s) => !["Won", "Lost"].includes(s));

  const [facetResult] = await Lead.aggregate([
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        pipeline: [
          { $match: { status: { $in: openStatuses } } },
          { $group: { _id: null, total: { $sum: "$estimatedProjectValue" } } },
        ],
        bySource: [
          { $group: { _id: "$leadSource", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const statusMap = Object.fromEntries(
    (facetResult.byStatus || []).map((row) => [row._id, row.count])
  );
  const totalLeads = facetResult.total[0]?.count || 0;
  const newLeads = statusMap.New || 0;
  const qualifiedLeads = statusMap.Qualified || 0;
  const wonLeads = statusMap.Won || 0;
  const lostLeads = statusMap.Lost || 0;
  const pipelineAgg = facetResult.pipeline;
  const bySource = facetResult.bySource;

  const closed = wonLeads + lostLeads;
  const conversionRate = closed > 0 ? Math.round((wonLeads / closed) * 1000) / 10 : 0;

  return {
    totalLeads,
    newLeads,
    qualifiedLeads,
    wonLeads,
    lostLeads,
    conversionRate,
    pipelineValue: pipelineAgg[0]?.total || 0,
    leadsBySource: bySource.map((r) => ({ source: r._id, count: r.count })),
  };
};

module.exports = { computeLeadMetrics };
