const Freelancer = require("../../models/Freelancer");
const { SERVICE_CATEGORIES } = require("../../constants/serviceCategories");
const FreelancerPayment = require("../../models/FreelancerPayment");
const Project = require("../../models/Project");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const {
  getFinancialsForFreelancer,
  attachFinancialsToList,
} = require("../../utils/freelancerTotals");
const { getProjectFreelancerDue } = require("../../utils/projectFreelancerPayment");
const {
  findAssignmentForFreelancer,
  applyPaymentToAssignment: applyLegacyPaymentToProject,
} = require("../../utils/projectFreelancerAssignments");
const {
  listAssignmentsForFreelancer,
  applyPaymentToAssignment,
  updateFreelancerCount,
} = require("../../services/deliverableAssignment.service");
const {
  fetchDeliverableById,
  fetchDeliverablesByIds,
} = require("../../utils/resolveDeliverableRecords");
const { toSafeRegex } = require("../../utils/escapeRegex");

const BASIC_FIELDS = [
  "name",
  "skills",
  "contactNumber",
  "email",
  "availabilityStatus",
  "notes",
];

const pickBasicFields = (body) => {
  const payload = {};
  BASIC_FIELDS.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  if (payload.skills) {
    payload.skills = payload.skills.filter((s) => SERVICE_CATEGORIES.includes(s));
  }
  return payload;
};

const getFreelancers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.search) {
    const pattern = toSafeRegex(req.query.search);
    if (pattern) {
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
  }
  if (req.query.availabilityStatus) filter.availabilityStatus = req.query.availabilityStatus;
  if (req.query.skill) filter.skills = req.query.skill;

  const lite = req.query.lite === "1" || req.query.lite === "true";
  const sort = lite ? { name: 1 } : { createdAt: -1 };

  const [freelancers, total] = await Promise.all([
    Freelancer.find(filter)
      .select(lite ? "name skills availabilityStatus" : undefined)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Freelancer.countDocuments(filter),
  ]);

  const data = lite ? freelancers : await attachFinancialsToList(freelancers);

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getFreelancer = asyncHandler(async (req, res) => {
  const freelancer = await Freelancer.findById(req.params.id);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const financials = await getFinancialsForFreelancer(freelancer._id);
  const assignments = await listAssignmentsForFreelancer(freelancer._id);

  res.json({
    success: true,
    data: {
      ...freelancer.toObject(),
      ...financials,
      assignments,
    },
  });
});

const getLegacyFreelancerProjects = async (freelancerId) => {
  const projects = await Project.find({
    isOutsourced: true,
    $or: [
      { "assignedFreelancers.freelancerId": freelancerId },
      { freelancerId },
    ],
  })
    .select(
      "clientName businessName projectType projectTitle workStatus outsourcingCost amountPaidToFreelancer freelancerPaymentStatus assignedFreelancers createdAt"
    )
    .sort({ createdAt: -1 })
    .lean();

  return projects
    .map((p) => {
      const assignment = findAssignmentForFreelancer(p, freelancerId);
      if (!assignment) return null;
      const cost = assignment.outsourcingCost || 0;
      const paid = assignment.amountPaidToFreelancer || 0;
      return {
        _id: p._id,
        assignmentId: null,
        projectId: p._id,
        deliverableId: null,
        project: p,
        deliverable: { title: p.projectType, category: p.projectType, status: p.workStatus },
        role: "General",
        cost,
        amountPaid: paid,
        paymentStatus: assignment.freelancerPaymentStatus,
        due: getProjectFreelancerDue(cost, paid),
        status: p.workStatus,
        legacy: true,
      };
    })
    .filter(Boolean);
};

const getFreelancerProjects = asyncHandler(async (req, res) => {
  const freelancerId = req.params.id;
  let data = await listAssignmentsForFreelancer(freelancerId);

  if (!data.length) {
    data = await getLegacyFreelancerProjects(freelancerId);
  }

  const filtered =
    req.query.pendingOnly === "1" || req.query.pendingOnly === "true"
      ? data.filter((p) => p.due > 0)
      : data;

  res.json({ success: true, data: filtered });
});

const getFreelancerPayments = asyncHandler(async (req, res) => {
  const freelancer = await Freelancer.findById(req.params.id);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const payments = await FreelancerPayment.find({ freelancerId: req.params.id })
    .sort({ paymentDate: -1 })
    .limit(50)
    .lean();

  const deliverableMap = await fetchDeliverablesByIds(
    payments.map((p) => p.deliverableId).filter(Boolean)
  );

  const Service = require("../../models/Service");
  const ownerIds = [
    ...new Set(payments.map((p) => p.projectId?.toString()).filter(Boolean)),
  ];
  const [services, projects] = await Promise.all([
    Service.find({ _id: { $in: ownerIds } })
      .select("clientName businessName name")
      .lean(),
    Project.find({ _id: { $in: ownerIds } })
      .select("clientName businessName projectTitle")
      .lean(),
  ]);
  const ownerMap = Object.fromEntries([
    ...services.map((s) => [s._id.toString(), s]),
    ...projects.map((p) => [p._id.toString(), p]),
  ]);

  const enrichedPayments = payments.map((p) => ({
    ...p,
    projectId: ownerMap[p.projectId?.toString()] || p.projectId,
    deliverableId: p.deliverableId
      ? deliverableMap[p.deliverableId.toString()] || p.deliverableId
      : p.deliverableId,
  }));

  const financials = await getFinancialsForFreelancer(req.params.id);

  res.json({ success: true, data: { payments: enrichedPayments, financials } });
});

const recordFreelancerPayment = asyncHandler(async (req, res) => {
  const freelancer = await Freelancer.findById(req.params.id);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const assignmentId = req.body.assignmentId;
  const projectId = req.body.projectId;

  if (assignmentId) {
    const DeliverableAssignment = require("../../models/DeliverableAssignment");
    const assignment = await DeliverableAssignment.findOne({
      _id: assignmentId,
      freelancerId: req.params.id,
      deletedAt: null,
    });

    if (!assignment) {
      throw new ApiError(400, "Invalid assignment for this freelancer");
    }

    const deliverable = await fetchDeliverableById(assignment.deliverableId);
    if (!deliverable?.ownerId) {
      throw new ApiError(400, "Invalid assignment for this freelancer");
    }

    const due = getProjectFreelancerDue(assignment.cost, assignment.amountPaid);
    if (due <= 0) throw new ApiError(400, "Nothing due on this assignment");

    const payFull = req.body.payFull === true || req.body.payFull === "true";
    let amount = payFull ? due : Number(req.body.amount);
    if (!amount || amount <= 0) throw new ApiError(400, "Payment amount must be greater than 0");
    if (amount > due) throw new ApiError(400, `Payment cannot exceed amount due (${due})`);

    await applyPaymentToAssignment(assignmentId, amount);

    const payment = await FreelancerPayment.create({
      freelancerId: req.params.id,
      projectId: deliverable.ownerId,
      deliverableId: deliverable._id,
      assignmentId: assignment._id,
      amount,
      paymentDate: req.body.paymentDate || new Date(),
      paidVia: req.body.paidVia || "UPI",
      notes: req.body.notes || "",
      recordedBy: req.admin.name,
    });

    const Service = require("../../models/Service");
    const owner =
      (await Service.findById(deliverable.ownerId)
        .select("clientName businessName name")
        .lean()) ||
      (await Project.findById(deliverable.ownerId)
        .select("clientName businessName projectTitle")
        .lean());

    const paymentObj = payment.toObject();
    paymentObj.projectId = owner || deliverable.ownerId;
    paymentObj.deliverableId = deliverable;

    const updatedFinancials = await getFinancialsForFreelancer(req.params.id);
    return res.status(201).json({
      success: true,
      data: { payment: paymentObj, financials: updatedFinancials },
    });
  }

  if (!projectId) {
    throw new ApiError(400, "Select an assignment or project to pay against");
  }

  const project = await Project.findOne({
    _id: projectId,
    isOutsourced: true,
    $or: [
      { "assignedFreelancers.freelancerId": req.params.id },
      { freelancerId: req.params.id },
    ],
  });
  if (!project) throw new ApiError(400, "Invalid project for this freelancer");

  const assignment = findAssignmentForFreelancer(project, req.params.id);
  if (!assignment) throw new ApiError(400, "Invalid project for this freelancer");

  const projectDue = getProjectFreelancerDue(
    assignment.outsourcingCost,
    assignment.amountPaidToFreelancer
  );
  if (projectDue <= 0) throw new ApiError(400, "Nothing due on this project");

  const payFull = req.body.payFull === true || req.body.payFull === "true";
  let amount = payFull ? projectDue : Number(req.body.amount);
  if (!amount || amount <= 0) throw new ApiError(400, "Payment amount must be greater than 0");
  if (amount > projectDue) {
    throw new ApiError(400, `Payment cannot exceed amount due (${projectDue}) for this project`);
  }

  applyLegacyPaymentToProject(project, req.params.id, amount);
  await project.save();

  const payment = await FreelancerPayment.create({
    freelancerId: req.params.id,
    projectId: project._id,
    amount,
    paymentDate: req.body.paymentDate || new Date(),
    paidVia: req.body.paidVia || "UPI",
    notes: req.body.notes || "",
    recordedBy: req.admin.name,
  });

  await payment.populate("projectId", "clientName businessName projectType projectTitle");
  const updatedFinancials = await getFinancialsForFreelancer(req.params.id);

  res.status(201).json({
    success: true,
    data: { payment, project, financials: updatedFinancials },
  });
});

const createFreelancer = asyncHandler(async (req, res) => {
  const body = pickBasicFields(req.body);
  if (!body.skills?.length) {
    throw new ApiError(400, "Select at least one skill");
  }
  const freelancer = await Freelancer.create(body);
  const data = await attachFinancialsToList([freelancer]);
  res.status(201).json({ success: true, data: data[0] });
});

const updateFreelancer = asyncHandler(async (req, res) => {
  const body = pickBasicFields(req.body);
  if (body.skills !== undefined && !body.skills.length) {
    throw new ApiError(400, "Select at least one skill");
  }
  const freelancer = await Freelancer.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const financials = await getFinancialsForFreelancer(freelancer._id);
  res.json({
    success: true,
    data: { ...freelancer.toObject(), ...financials },
  });
});

const deleteFreelancer = asyncHandler(async (req, res) => {
  const freelancer = await Freelancer.findById(req.params.id);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const DeliverableAssignment = require("../../models/DeliverableAssignment");

  await Promise.all([
    DeliverableAssignment.updateMany(
      { freelancerId: freelancer._id, deletedAt: null },
      { deletedAt: new Date() }
    ),
    Project.updateMany(
      { "assignedFreelancers.freelancerId": freelancer._id },
      { $pull: { assignedFreelancers: { freelancerId: freelancer._id } } }
    ),
    Project.updateMany({ freelancerId: freelancer._id }, { $unset: { freelancerId: 1 } }),
    FreelancerPayment.deleteMany({ freelancerId: freelancer._id }),
    Freelancer.findByIdAndDelete(req.params.id),
  ]);

  res.json({ success: true, message: "Freelancer deleted" });
});

module.exports = {
  getFreelancers,
  getFreelancer,
  getFreelancerProjects,
  getFreelancerPayments,
  recordFreelancerPayment,
  createFreelancer,
  updateFreelancer,
  deleteFreelancer,
};
