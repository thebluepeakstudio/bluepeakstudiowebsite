const Deliverable = require("../models/Deliverable");
const Service = require("../models/Service");
const { SERVICE_CATEGORIES } = require("../constants/serviceCategories");
const ApiError = require("../utils/ApiError");
const { toIdString } = require("../utils/toIdString");
const {
  activeDeliverableFilter,
  deriveOverallStatus,
} = require("./serviceCalculations.service");
const { syncDueForDeliverableStatus } = require("./freelancerDue.service");

/** Sync work status only — service totalPrice is set on Service, not summed from deliverables. */
const syncServiceWorkStatusFromDeliverables = async (serviceId, session = null) => {
  const queryOpts = session ? { session } : {};
  const deliverables = await Deliverable.find({
    serviceId,
    ...activeDeliverableFilter,
  })
    .sort({ createdAt: 1 })
    .lean();

  const service = await Service.findById(serviceId, null, queryOpts);
  if (!service) throw new ApiError(404, "Service not found");

  if (deliverables.length) {
    service.workStatus = deriveOverallStatus(deliverables);
  }

  await service.save(queryOpts);
  return service;
};

const resolveDeliverableCategory = (service, data = {}) =>
  data.category || service?.category || service?.name || SERVICE_CATEGORIES[0];

const createDeliverable = async (serviceId, data, session = null) => {
  const service = await Service.findById(serviceId).session(session || null);
  if (!service) throw new ApiError(404, "Service not found");

  const deliverable = await Deliverable.create(
    [
      {
        serviceId,
        title: data.title,
        category: resolveDeliverableCategory(service, data),
        description: data.description,
        dueDate: data.dueDate || data.expectedCompletion || undefined,
        actualCompletion: data.actualCompletion || undefined,
        status: data.status || "Not Started",
        progress: data.progress,
      },
    ],
    session ? { session } : undefined
  );

  await syncServiceWorkStatusFromDeliverables(serviceId, session);
  return deliverable[0];
};

const updateDeliverable = async (serviceId, deliverableId, data, session = null) => {
  const deliverable = await Deliverable.findOne({
    _id: deliverableId,
    serviceId,
    ...activeDeliverableFilter,
  }).session(session || null);
  if (!deliverable) throw new ApiError(404, "Deliverable not found");

  const fields = [
    "title",
    "description",
    "dueDate",
    "actualCompletion",
    "status",
    "progress",
  ];
  fields.forEach((key) => {
    if (data[key] !== undefined) deliverable[key] = data[key];
  });
  if (data.expectedCompletion !== undefined && data.dueDate === undefined) {
    deliverable.dueDate = data.expectedCompletion;
  }

  await deliverable.save(session ? { session } : undefined);
  if (data.status !== undefined) {
    await syncDueForDeliverableStatus(deliverableId, session);
  }
  await syncServiceWorkStatusFromDeliverables(serviceId, session);
  return deliverable;
};

const softDeleteDeliverable = async (serviceId, deliverableId, session = null) => {
  const deliverable = await Deliverable.findOne({
    _id: deliverableId,
    serviceId,
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

  await syncServiceWorkStatusFromDeliverables(serviceId, session);
  return deliverable;
};

const listDeliverables = async (serviceId) => {
  const DeliverableAssignment = require("../models/DeliverableAssignment");
  const deliverables = await Deliverable.find({
    serviceId,
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
    const key = toIdString(a.deliverableId);
    if (!key) continue;
    if (!byDeliverable[key]) byDeliverable[key] = [];
    byDeliverable[key].push(a);
  }

  return deliverables.map((d) => {
    const id = toIdString(d._id);
    const rows = byDeliverable[id] ? [...byDeliverable[id]] : [];
    const freelancerCost = rows.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
    return {
      ...d,
      expectedCompletion: d.dueDate,
      assignments: rows,
      freelancerCost,
      profit: 0 - freelancerCost,
    };
  });
};

const createDeliverablesBatch = async (serviceId, items, session) => {
  if (!items?.length) throw new ApiError(400, "At least one deliverable is required");
  const service = await Service.findById(serviceId).session(session || null);
  if (!service) throw new ApiError(404, "Service not found");
  const created = [];
  for (const item of items) {
    const docs = await Deliverable.create(
      [
        {
          serviceId,
          title: item.title,
          category: resolveDeliverableCategory(service, item),
          description: item.description,
          dueDate: item.dueDate || item.expectedCompletion || undefined,
          status: item.status || "Not Started",
        },
      ],
      { session }
    );
    created.push(docs[0]);
  }
  await syncServiceWorkStatusFromDeliverables(serviceId, session);
  return created;
};

module.exports = {
  syncServiceWorkStatusFromDeliverables,
  syncProjectFromDeliverables: syncServiceWorkStatusFromDeliverables,
  createDeliverable,
  updateDeliverable,
  softDeleteDeliverable,
  listDeliverables,
  createDeliverablesBatch,
};
