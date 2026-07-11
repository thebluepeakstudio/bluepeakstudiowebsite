const DeliverableAssignment = require("../models/DeliverableAssignment");
const Deliverable = require("../models/Deliverable");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const Freelancer = require("../models/Freelancer");
const ApiError = require("../utils/ApiError");
const { activeAssignmentFilter } = require("./serviceCalculations.service");

const updateFreelancerCount = async (freelancerId, delta, session = null) => {
  if (!freelancerId) return;
  await Freelancer.findByIdAndUpdate(
    freelancerId,
    { $inc: { totalProjectsAssigned: delta } },
    session ? { session } : undefined
  );
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

  const assignment = await DeliverableAssignment.create(
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

  await updateFreelancerCount(data.freelancerId, 1, session);
  const query = DeliverableAssignment.findById(assignment[0]._id)
    .populate("freelancerId", "name email contactNumber skills")
    .lean();
  if (session) query.session(session);
  return query;
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
  if (data.cost !== undefined) assignment.cost = Number(data.cost) || 0;
  if (data.remarks !== undefined) assignment.remarks = data.remarks;

  await assignment.save(session ? { session } : undefined);
  return DeliverableAssignment.findById(assignment._id)
    .populate("freelancerId", "name email contactNumber skills")
    .lean();
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
  await updateFreelancerCount(assignment.freelancerId, -1, session);
  return assignment;
};

const applyPaymentToAssignment = async (assignmentId, amount, session = null) => {
  const assignment = await DeliverableAssignment.findById(assignmentId).session(session || null);
  if (!assignment || assignment.deletedAt) throw new ApiError(404, "Assignment not found");

  assignment.amountPaid = (Number(assignment.amountPaid) || 0) + amount;
  await assignment.save(session ? { session } : undefined);
  return assignment;
};

const createAssignmentsBatch = async (deliverableId, assignments, session) => {
  const created = [];
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
    await updateFreelancerCount(row.freelancerId, 1, session);
    created.push(docs[0]);
  }
  return created;
};

const listAssignmentsForFreelancer = async (freelancerId) => {
  const assignments = await DeliverableAssignment.find({
    freelancerId,
    ...activeAssignmentFilter,
  })
    .populate({
      path: "deliverableId",
      select: "title category status progress serviceId projectId sellingPrice dueDate expectedCompletion",
      match: { deletedAt: null },
    })
    .lean();

  const Service = require("../models/Service");
  const Project = require("../models/Project");
  const valid = assignments.filter((a) => a.deliverableId);

  const serviceIds = [
    ...new Set(
      valid
        .map((a) => a.deliverableId.serviceId || a.deliverableId.projectId)
        .filter(Boolean)
        .map((id) => id.toString())
    ),
  ];

  const [services, projects] = await Promise.all([
    Service.find({ _id: { $in: serviceIds } })
      .select("clientName businessName name workStatus paymentStatus")
      .lean(),
    Project.find({ _id: { $in: serviceIds } })
      .select("clientName businessName projectTitle workStatus paymentStatus")
      .lean(),
  ]);

  const ownerMap = Object.fromEntries([
    ...services.map((s) => [s._id.toString(), s]),
    ...projects.map((p) => [p._id.toString(), p]),
  ]);

  return valid
    .filter((a) => {
      const ownerId = (a.deliverableId.serviceId || a.deliverableId.projectId)?.toString();
      return ownerId && ownerMap[ownerId];
    })
    .map((a) => {
      const ownerId = (a.deliverableId.serviceId || a.deliverableId.projectId).toString();
      const project = ownerMap[ownerId];
      const cost = Number(a.cost) || 0;
      const paid = Number(a.amountPaid) || 0;
      return {
        _id: a._id,
        assignmentId: a._id,
        projectId: a.deliverableId.serviceId || a.deliverableId.projectId,
        deliverableId: a.deliverableId._id,
        project,
        deliverable: {
          ...a.deliverableId,
          expectedCompletion: a.deliverableId.dueDate || a.deliverableId.expectedCompletion,
          projectId: a.deliverableId.serviceId || a.deliverableId.projectId,
        },
        role: a.role,
        cost,
        amountPaid: paid,
        paymentStatus: a.paymentStatus,
        due: Math.max(0, cost - paid),
        status: a.deliverableId.status,
      };
    });
};

module.exports = {
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  applyPaymentToAssignment,
  createAssignmentsBatch,
  listAssignmentsForFreelancer,
  updateFreelancerCount,
};
