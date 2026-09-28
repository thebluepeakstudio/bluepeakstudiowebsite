const DeliverableAssignment = require("../models/DeliverableAssignment");
const Deliverable = require("../models/Deliverable");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const Freelancer = require("../models/Freelancer");
const FreelancerPayment = require("../models/FreelancerPayment");
const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");
const { fetchDeliverablesByIds } = require("../utils/resolveDeliverableRecords");
const { activeAssignmentFilter } = require("./serviceCalculations.service");
const { findAssignmentForFreelancer } = require("../utils/projectFreelancerAssignments");

const updateFreelancerCount = async (freelancerId, delta, session = null) => {
  if (!freelancerId) return;
  await Freelancer.findByIdAndUpdate(
    freelancerId,
    { $inc: { totalProjectsAssigned: delta } },
    session ? { session } : undefined
  );
};

/** Distinct active projects/services this freelancer is assigned to (source of truth for list column). */
const syncFreelancerProjectCount = async (freelancerId, session = null) => {
  if (!freelancerId) return;
  const fid = freelancerId.toString();

  const assignments = await DeliverableAssignment.find({
    freelancerId,
    ...activeAssignmentFilter,
  })
    .select("deliverableId")
    .lean()
    .session(session || null);

  const deliverableMap = await fetchDeliverablesByIds(
    assignments.map((a) => a.deliverableId)
  );

  const ownerIds = new Set();
  for (const a of assignments) {
    const deliverable = deliverableMap[a.deliverableId?.toString()];
    if (deliverable?.ownerId) ownerIds.add(deliverable.ownerId.toString());
  }

  const legacyProjects = await Project.find({
    isOutsourced: true,
    $or: [
      { "assignedFreelancers.freelancerId": freelancerId },
      { freelancerId },
    ],
  })
    .select("_id assignedFreelancers freelancerId")
    .lean()
    .session(session || null);

  for (const p of legacyProjects) {
    if (findAssignmentForFreelancer(p, freelancerId)) {
      ownerIds.add(p._id.toString());
    }
  }

  await Freelancer.findByIdAndUpdate(
    freelancerId,
    { totalProjectsAssigned: ownerIds.size },
    session ? { session } : undefined
  );
};

const cancelDueAndPaymentsForAssignment = async (assignmentId, session = null) => {
  const FreelancerDue = require("../models/FreelancerDue");
  await FreelancerDue.deleteMany(
    { deliverableAssignmentId: assignmentId },
    session ? { session } : undefined
  );
  await FreelancerPayment.deleteMany(
    { assignmentId },
    session ? { session } : undefined
  );
};

const removeAssignmentsForDeliverable = async (deliverableId, session = null) => {
  const query = DeliverableAssignment.find({ deliverableId, ...activeAssignmentFilter });
  if (session) query.session(session);
  const assignments = await query;
  const freelancerIds = new Set();

  for (const assignment of assignments) {
    assignment.deletedAt = new Date();
    await assignment.save(session ? { session } : undefined);
    await cancelDueAndPaymentsForAssignment(assignment._id, session);
    freelancerIds.add(assignment.freelancerId.toString());
  }

  for (const id of freelancerIds) {
    await syncFreelancerProjectCount(id, session);
  }
};

const getDeliverableOrFail = async (ownerId, deliverableId, session = null) => {
  let deliverable = await Deliverable.findOne({
    _id: deliverableId,
    serviceId: ownerId,
    deletedAt: null,
  }).session(session || null);

  if (!deliverable) {
    deliverable = await ProjectDeliverable.findOne({
      _id: deliverableId,
      projectId: ownerId,
      deletedAt: null,
    }).session(session || null);
  }

  if (!deliverable) throw new ApiError(404, "Deliverable not found");
  return deliverable;
};

const populateAssignment = (assignmentId, session = null) => {
  const query = DeliverableAssignment.findById(assignmentId)
    .populate("freelancerId", "name email contactNumber skills")
    .lean();
  if (session) query.session(session);
  return query;
};

const createAssignment = async (ownerId, deliverableId, data, session = null) => {
  await getDeliverableOrFail(ownerId, deliverableId, session);

  const freelancer = await Freelancer.findById(data.freelancerId).session(session || null);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const existing = await DeliverableAssignment.findOne({
    deliverableId,
    freelancerId: data.freelancerId,
    ...activeAssignmentFilter,
  }).session(session || null);
  if (existing) throw new ApiError(400, "Freelancer already assigned to this deliverable");

  const resurrectQuery = DeliverableAssignment.findOne({
    deliverableId,
    freelancerId: data.freelancerId,
    deletedAt: { $ne: null },
  })
    .sort({ deletedAt: -1 })
    .session(session || null);
  const resurrect = await resurrectQuery;

  let assignmentDoc;
  if (resurrect) {
    resurrect.deletedAt = null;
    resurrect.role = data.role || resurrect.role || "General";
    resurrect.cost = Number(data.cost) || 0;
    resurrect.amountPaid = 0;
    if (data.remarks !== undefined) resurrect.remarks = data.remarks;
    await resurrect.save(session ? { session } : undefined);
    assignmentDoc = resurrect;
  } else {
    const created = await DeliverableAssignment.create(
      [
        {
          deliverableId,
          freelancerId: data.freelancerId,
          role: data.role || "General",
          cost: Number(data.cost) || 0,
          amountPaid: 0,
          remarks: data.remarks,
        },
      ],
      session ? { session } : undefined
    );
    assignmentDoc = created[0];
  }

  await syncFreelancerProjectCount(data.freelancerId, session);

  const { syncDueForAssignment } = require("./freelancerDue.service");
  await syncDueForAssignment(assignmentDoc, session);

  return populateAssignment(assignmentDoc._id, session);
};

const updateAssignment = async (ownerId, deliverableId, assignmentId, data, session = null) => {
  await getDeliverableOrFail(ownerId, deliverableId, session);

  const assignment = await DeliverableAssignment.findOne({
    _id: assignmentId,
    deliverableId,
    ...activeAssignmentFilter,
  }).session(session || null);
  if (!assignment) throw new ApiError(404, "Assignment not found");

  if (data.role !== undefined) assignment.role = data.role;
  if (data.cost !== undefined) {
    const newCost = Number(data.cost) || 0;
    const paid = Number(assignment.amountPaid) || 0;
    if (newCost < paid) {
      throw new ApiError(
        400,
        `Cost cannot be less than amount already paid (${paid})`
      );
    }
    assignment.cost = newCost;
  }
  if (data.remarks !== undefined) assignment.remarks = data.remarks;

  await assignment.save(session ? { session } : undefined);

  const { syncDueForAssignment } = require("./freelancerDue.service");
  await syncDueForAssignment(assignment, session);

  return populateAssignment(assignment._id, session);
};

const softDeleteAssignment = async (ownerId, deliverableId, assignmentId, session = null) => {
  await getDeliverableOrFail(ownerId, deliverableId, session);

  const assignment = await DeliverableAssignment.findOne({
    _id: assignmentId,
    deliverableId,
    ...activeAssignmentFilter,
  }).session(session || null);
  if (!assignment) throw new ApiError(404, "Assignment not found");

  assignment.deletedAt = new Date();
  await assignment.save(session ? { session } : undefined);
  await cancelDueAndPaymentsForAssignment(assignment._id, session);
  await syncFreelancerProjectCount(assignment.freelancerId, session);
  return assignment;
};

const applyPaymentToAssignment = async (assignmentId, amount, session = null) => {
  const assignment = await DeliverableAssignment.findById(assignmentId).session(session || null);
  if (!assignment || assignment.deletedAt) throw new ApiError(404, "Assignment not found");

  assignment.amountPaid = (Number(assignment.amountPaid) || 0) + amount;
  await assignment.save(session ? { session } : undefined);

  const { syncDueForAssignment } = require("./freelancerDue.service");
  await syncDueForAssignment(assignment, session);

  return assignment;
};

const createAssignmentsBatch = async (deliverableId, assignments, session) => {
  const created = [];
  const freelancerIds = new Set();
  for (const row of assignments || []) {
    if (!row.freelancerId) continue;
    const docs = await DeliverableAssignment.create(
      [
        {
          deliverableId,
          freelancerId: row.freelancerId,
          role: row.role || "General",
          cost: Number(row.cost) || 0,
          remarks: row.remarks,
        },
      ],
      { session }
    );
    freelancerIds.add(row.freelancerId.toString());
    created.push(docs[0]);
  }
  for (const id of freelancerIds) {
    await syncFreelancerProjectCount(id, session);
  }
  return created;
};

const listAssignmentsForFreelancer = async (freelancerId) => {
  const assignments = await DeliverableAssignment.find({
    freelancerId,
    ...activeAssignmentFilter,
  }).lean();

  if (!assignments.length) return [];

  const deliverableMap = await fetchDeliverablesByIds(
    assignments.map((a) => a.deliverableId)
  );

  const Service = require("../models/Service");

  const ownerIds = [
    ...new Set(
      assignments
        .map((a) => deliverableMap[a.deliverableId?.toString()]?.ownerId)
        .filter(Boolean)
        .map((id) => id.toString())
    ),
  ];

  const [services, projects] = await Promise.all([
    Service.find({ _id: { $in: ownerIds } })
      .select("clientName businessName name workStatus paymentStatus")
      .lean(),
    Project.find({ _id: { $in: ownerIds } })
      .select("clientName businessName projectTitle workStatus paymentStatus")
      .lean(),
  ]);

  const ownerMap = Object.fromEntries([
    ...services.map((s) => [s._id.toString(), s]),
    ...projects.map((p) => [p._id.toString(), p]),
  ]);

  return assignments
    .map((a) => {
      const deliverable = deliverableMap[a.deliverableId?.toString()];
      if (!deliverable?.ownerId) return null;

      const ownerId = deliverable.ownerId.toString();
      const project = ownerMap[ownerId];
      if (!project) return null;

      const cost = Number(a.cost) || 0;
      const paid = Number(a.amountPaid) || 0;
      return {
        _id: a._id,
        assignmentId: a._id,
        projectId: deliverable.ownerId,
        deliverableId: deliverable._id,
        project,
        deliverable: {
          ...deliverable,
          projectId: deliverable.ownerId,
        },
        role: a.role,
        cost,
        amountPaid: paid,
        paymentStatus: a.paymentStatus,
        due: Math.max(0, cost - paid),
        status: deliverable.status,
      };
    })
    .filter(Boolean);
};

module.exports = {
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  applyPaymentToAssignment,
  createAssignmentsBatch,
  listAssignmentsForFreelancer,
  updateFreelancerCount,
  syncFreelancerProjectCount,
  removeAssignmentsForDeliverable,
  cancelDueAndPaymentsForAssignment,
};
