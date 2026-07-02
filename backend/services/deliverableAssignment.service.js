const DeliverableAssignment = require("../models/DeliverableAssignment");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const Freelancer = require("../models/Freelancer");
const ApiError = require("../utils/ApiError");
const { activeAssignmentFilter } = require("./projectCalculations.service");

const updateFreelancerCount = async (freelancerId, delta, session = null) => {
  if (!freelancerId) return;
  await Freelancer.findByIdAndUpdate(
    freelancerId,
    { $inc: { totalProjectsAssigned: delta } },
    session ? { session } : undefined
  );
};

const getDeliverableOrFail = async (projectId, deliverableId, session = null) => {
  const deliverable = await ProjectDeliverable.findOne({
    _id: deliverableId,
    projectId,
    deletedAt: null,
  }).session(session || null);
  if (!deliverable) throw new ApiError(404, "Deliverable not found");
  return deliverable;
};

const createAssignment = async (projectId, deliverableId, data, session = null) => {
  await getDeliverableOrFail(projectId, deliverableId, session);

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

const updateAssignment = async (projectId, deliverableId, assignmentId, data, session = null) => {
  await getDeliverableOrFail(projectId, deliverableId, session);

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

const softDeleteAssignment = async (projectId, deliverableId, assignmentId, session = null) => {
  await getDeliverableOrFail(projectId, deliverableId, session);

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
      select: "title category status progress projectId sellingPrice expectedCompletion",
      match: { deletedAt: null },
    })
    .lean();

  const Project = require("../models/Project");
  const valid = assignments.filter((a) => a.deliverableId);

  const projectIds = [...new Set(valid.map((a) => a.deliverableId.projectId.toString()))];
  const projects = await Project.find({ _id: { $in: projectIds } })
    .select("clientName businessName projectTitle workStatus paymentStatus")
    .lean();
  const projectMap = Object.fromEntries(projects.map((p) => [p._id.toString(), p]));

  return valid
    .filter((a) => projectMap[a.deliverableId.projectId.toString()])
    .map((a) => {
    const project = projectMap[a.deliverableId.projectId.toString()];
    const cost = Number(a.cost) || 0;
    const paid = Number(a.amountPaid) || 0;
    return {
      _id: a._id,
      assignmentId: a._id,
      projectId: a.deliverableId.projectId,
      deliverableId: a.deliverableId._id,
      project,
      deliverable: a.deliverableId,
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
