const Freelancer = require("../../models/Freelancer");
const { PROJECT_TYPES } = require("../../models/Project");
const FreelancerPayment = require("../../models/FreelancerPayment");
const Project = require("../../models/Project");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const {
  getFinancialsForFreelancer,
  attachFinancialsToList,
} = require("../../utils/freelancerTotals");
const {
  getProjectFreelancerDue,
  syncProjectFreelancerPaymentFields,
} = require("../../utils/projectFreelancerPayment");

const BASIC_FIELDS = [
  "name",
  "skills",
  "contactNumber",
  "email",
  "address",
  "pricing",
  "availabilityStatus",
  "notes",
];

const pickBasicFields = (body) => {
  const payload = {};
  BASIC_FIELDS.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  if (payload.skills) {
    payload.skills = payload.skills.filter((s) => PROJECT_TYPES.includes(s));
  }
  return payload;
};

const getFreelancers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
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

  res.json({
    success: true,
    data: {
      ...freelancer.toObject(),
      ...financials,
    },
  });
});

const getFreelancerProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    freelancerId: req.params.id,
    isOutsourced: true,
  })
    .select(
      "clientName businessName projectType projectTitle workStatus outsourcingCost amountPaidToFreelancer freelancerPaymentStatus createdAt"
    )
    .sort({ createdAt: -1 })
    .lean();

  const data = projects.map((p) => {
    const doc = p.toObject();
    const cost = doc.outsourcingCost || 0;
    const paid = doc.amountPaidToFreelancer || 0;
    return {
      ...doc,
      projectDue: getProjectFreelancerDue(cost, paid),
    };
  });

  res.json({ success: true, data });
});

const getFreelancerPayments = asyncHandler(async (req, res) => {
  const freelancer = await Freelancer.findById(req.params.id);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const payments = await FreelancerPayment.find({ freelancerId: req.params.id })
    .populate("projectId", "clientName businessName projectType")
    .sort({ paymentDate: -1 })
    .limit(50)
    .lean();
  const financials = await getFinancialsForFreelancer(req.params.id);

  res.json({ success: true, data: { payments, financials } });
});

const recordFreelancerPayment = asyncHandler(async (req, res) => {
  const freelancer = await Freelancer.findById(req.params.id);
  if (!freelancer) throw new ApiError(404, "Freelancer not found");

  const projectId = req.body.projectId;
  if (!projectId) {
    throw new ApiError(400, "Select a project to pay against");
  }

  const project = await Project.findOne({
    _id: projectId,
    freelancerId: req.params.id,
    isOutsourced: true,
  });
  if (!project) {
    throw new ApiError(400, "Invalid project for this freelancer");
  }

  const projectDue = getProjectFreelancerDue(
    project.outsourcingCost,
    project.amountPaidToFreelancer
  );
  if (projectDue <= 0) {
    throw new ApiError(400, "Nothing due on this project");
  }

  const payFull = req.body.payFull === true || req.body.payFull === "true";
  let amount = payFull ? projectDue : Number(req.body.amount);

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Payment amount must be greater than 0");
  }
  if (amount > projectDue) {
    throw new ApiError(400, `Payment cannot exceed amount due (${projectDue}) for this project`);
  }

  project.amountPaidToFreelancer = (project.amountPaidToFreelancer || 0) + amount;
  syncProjectFreelancerPaymentFields(project);
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

  await payment.populate("projectId", "clientName businessName projectType");

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

  await Promise.all([
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
