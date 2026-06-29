const mongoose = require("mongoose");
const Project = require("../models/Project");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const ApiError = require("../utils/ApiError");
const {
  activeDeliverableFilter,
  deriveOverallStatus,
  sumDeliverablePrices,
} = require("./projectCalculations.service");

const syncProjectFromDeliverables = async (projectId, session = null) => {
  const queryOpts = session ? { session } : {};
  const deliverables = await ProjectDeliverable.find({
    projectId,
    ...activeDeliverableFilter,
  })
    .sort({ createdAt: 1 })
    .lean();

  const project = await Project.findById(projectId, null, queryOpts);
  if (!project) throw new ApiError(404, "Project not found");

  if (deliverables.length) {
    project.totalAmount = sumDeliverablePrices(deliverables);
    project.workStatus = deriveOverallStatus(deliverables);
  }

  await project.save(queryOpts);
  return project;
};

const validateDeliverableInput = (data) => {
  const price = Number(data.sellingPrice);
  if (data.sellingPrice !== undefined && (Number.isNaN(price) || price < 0)) {
    throw new ApiError(400, "Invalid amount");
  }
};

const createDeliverable = async (projectId, data, session = null) => {
  validateDeliverableInput(data);
  const project = await Project.findById(projectId).session(session || null);
  if (!project) throw new ApiError(404, "Project not found");

  const deliverable = await ProjectDeliverable.create(
    [
      {
        projectId,
        title: data.title,
        category: data.category,
        description: data.description,
        sellingPrice: Number(data.sellingPrice) || 0,
        expectedCompletion: data.expectedCompletion || undefined,
        actualCompletion: data.actualCompletion || undefined,
        status: data.status || "Not Started",
      },
    ],
    session ? { session } : undefined
  );

  await syncProjectFromDeliverables(projectId, session);
  return deliverable[0];
};

const updateDeliverable = async (projectId, deliverableId, data, session = null) => {
  validateDeliverableInput(data);
  const deliverable = await ProjectDeliverable.findOne({
    _id: deliverableId,
    projectId,
    ...activeDeliverableFilter,
  }).session(session || null);
  if (!deliverable) throw new ApiError(404, "Deliverable not found");

  const fields = [
    "title",
    "category",
    "description",
    "sellingPrice",
    "expectedCompletion",
    "actualCompletion",
    "status",
  ];
  fields.forEach((key) => {
    if (data[key] !== undefined) {
      if (key === "sellingPrice") {
        deliverable[key] = Number(data[key]) || 0;
      } else {
        deliverable[key] = data[key];
      }
    }
  });

  await deliverable.save(session ? { session } : undefined);
  await syncProjectFromDeliverables(projectId, session);
  return deliverable;
};

const softDeleteDeliverable = async (projectId, deliverableId, session = null) => {
  const deliverable = await ProjectDeliverable.findOne({
    _id: deliverableId,
    projectId,
    ...activeDeliverableFilter,
  }).session(session || null);
  if (!deliverable) throw new ApiError(404, "Deliverable not found");

  deliverable.deletedAt = new Date();
  await deliverable.save(session ? { session } : undefined);

  const DeliverableAssignment = require("../models/DeliverableAssignment");
  await DeliverableAssignment.updateMany(
    { deliverableId: deliverable._id, deletedAt: null },
    { deletedAt: new Date() },
    session ? { session } : undefined
  );

  await syncProjectFromDeliverables(projectId, session);
  return deliverable;
};

const listDeliverables = async (projectId) => {
  const DeliverableAssignment = require("../models/DeliverableAssignment");
  const deliverables = await ProjectDeliverable.find({
    projectId,
    ...activeDeliverableFilter,
  })
    .sort({ createdAt: 1 })
    .lean();

  const ids = deliverables.map((d) => d._id);
  const assignments = await DeliverableAssignment.find({
    deliverableId: { $in: ids },
    deletedAt: null,
  })
    .populate("freelancerId", "name email contactNumber skills")
    .lean();

  const byDeliverable = {};
  for (const a of assignments) {
    const key = a.deliverableId.toString();
    if (!byDeliverable[key]) byDeliverable[key] = [];
    byDeliverable[key].push(a);
  }

  return deliverables.map((d) => ({
    ...d,
    assignments: byDeliverable[d._id.toString()] || [],
    freelancerCost: (byDeliverable[d._id.toString()] || []).reduce(
      (sum, a) => sum + (Number(a.cost) || 0),
      0
    ),
    profit:
      (Number(d.sellingPrice) || 0) -
      (byDeliverable[d._id.toString()] || []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0),
  }));
};

const createDeliverablesBatch = async (projectId, items, session) => {
  if (!items?.length) throw new ApiError(400, "At least one deliverable is required");
  const created = [];
  for (const item of items) {
    validateDeliverableInput(item);
    const docs = await ProjectDeliverable.create(
      [
        {
          projectId,
          title: item.title,
          category: item.category,
          description: item.description,
          sellingPrice: Number(item.sellingPrice) || 0,
          expectedCompletion: item.expectedCompletion || undefined,
          status: item.status || "Not Started",
        },
      ],
      { session }
    );
    created.push(docs[0]);
  }
  await syncProjectFromDeliverables(projectId, session);
  return created;
};

module.exports = {
  syncProjectFromDeliverables,
  createDeliverable,
  updateDeliverable,
  softDeleteDeliverable,
  listDeliverables,
  createDeliverablesBatch,
};
