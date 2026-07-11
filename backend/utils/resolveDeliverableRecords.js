const Deliverable = require("../models/Deliverable");
const ProjectDeliverable = require("../models/ProjectDeliverable");

function normalizeDeliverableRecord(doc) {
  if (!doc) return null;
  const ownerId = doc.serviceId || doc.projectId;
  return {
    ...doc,
    serviceId: doc.serviceId,
    projectId: doc.projectId || doc.serviceId,
    ownerId,
    expectedCompletion: doc.dueDate || doc.expectedCompletion,
  };
}

/** Load deliverables by id from both CRM (Service) and legacy Project collections. */
async function fetchDeliverablesByIds(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
  if (!uniqueIds.length) return {};

  const [serviceRows, projectRows] = await Promise.all([
    Deliverable.find({ _id: { $in: uniqueIds }, deletedAt: null }).lean(),
    ProjectDeliverable.find({ _id: { $in: uniqueIds }, deletedAt: null }).lean(),
  ]);

  const map = {};
  for (const row of [...serviceRows, ...projectRows]) {
    map[row._id.toString()] = normalizeDeliverableRecord(row);
  }
  return map;
}

async function fetchDeliverableById(id) {
  if (!id) return null;
  const map = await fetchDeliverablesByIds([id]);
  return map[id.toString()] || null;
}

module.exports = {
  normalizeDeliverableRecord,
  fetchDeliverablesByIds,
  fetchDeliverableById,
};
