const Project = require("../../models/Project");
const Freelancer = require("../../models/Freelancer");
const FreelancerPayment = require("../../models/FreelancerPayment");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const {
  getProjectFreelancerDue,
  syncProjectFreelancerPaymentFields,
  resetFreelancerPaymentFields,
  shouldResetFreelancerPayment,
} = require("../../utils/projectFreelancerPayment");
const { syncClientToProject } = require("../../utils/syncClientToProject");

const projectLabel = (p) =>
  p.businessName ? `${p.clientName} — ${p.businessName}` : p.clientName || p.projectTitle || "Project";

const buildFilter = (query) => {
  const filter = {};
  if (query.workStatus) filter.workStatus = query.workStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.projectType) filter.projectType = query.projectType;
  if (query.clientId) filter.clientId = query.clientId;
  if (query.search) {
    filter.$or = [
      { clientName: { $regex: query.search, $options: "i" } },
      { projectTitle: { $regex: query.search, $options: "i" } },
      { businessName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }
  return filter;
};

const updateFreelancerCount = async (freelancerId, delta) => {
  if (!freelancerId) return;
  await Freelancer.findByIdAndUpdate(freelancerId, {
    $inc: { totalProjectsAssigned: delta },
  });
};

const getProjects = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select(
        "clientName businessName projectTitle projectType workStatus paymentStatus totalAmount remainingAmount advanceReceived dateOfOnboarding clientId freelancerId isOutsourced createdAt"
      )
      .populate("freelancerId", "name email")
      .populate("clientId", "name companyName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: projects,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getProjectSummary = asyncHandler(async (req, res) => {
  const [active, completed, partialPayments, pendingPayments] = await Promise.all([
    Project.countDocuments({
      workStatus: { $nin: ["Completed", "Delivered"] },
    }),
    Project.countDocuments({ workStatus: { $in: ["Completed", "Delivered"] } }),
    Project.countDocuments({ paymentStatus: "Partial" }),
    Project.aggregate([
      { $match: { paymentStatus: { $ne: "Paid" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      activeProjects: active,
      completedProjects: completed,
    partialPayments,
      pendingPayments: pendingPayments[0]?.total || 0,
    },
  });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .select("-attachments")
    .populate("freelancerId", "name email contactNumber skills")
    .populate("clientId", "name companyName email phone website")
    .lean();
  if (!project) throw new ApiError(404, "Project not found");
  res.json({ success: true, data: project });
});

const stripFreelancerPaymentOverrides = (body) => {
  const next = { ...body };
  delete next.amountPaidToFreelancer;
  delete next.freelancerPaymentStatus;
  return next;
};

const applyPaymentFields = (body, existing = {}) => {
  const total = Number(body.totalAmount ?? existing.totalAmount ?? 0) || 0;

  if (body.paymentStatus === "Paid") {
    body.remainingAmount = 0;
    if (total > 0) {
      body.advanceReceived = total;
    }
  } else {
    const advance = Number(body.advanceReceived ?? existing.advanceReceived ?? 0) || 0;
    body.remainingAmount = Math.max(0, total - advance);
  }
  return body;
};

const createProject = asyncHandler(async (req, res) => {
  if (!req.body.clientId && !req.body.clientName) {
    throw new ApiError(400, "Client is required");
  }
  let body = applyPaymentFields(stripFreelancerPaymentOverrides({ ...req.body }));
  if (body.clientId) body = await syncClientToProject(body);
  const project = await Project.create(body);
  if (project.isOutsourced && project.freelancerId) {
    resetFreelancerPaymentFields(project);
    syncProjectFreelancerPaymentFields(project);
    await project.save();
  }
  if (project.freelancerId) await updateFreelancerCount(project.freelancerId, 1);
  res.status(201).json({ success: true, data: project });
});

const updateProject = asyncHandler(async (req, res) => {
  const existing = await Project.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Project not found");

  const oldFreelancer = existing.freelancerId?.toString();
  const newFreelancer = req.body.freelancerId?.toString();

  let body = applyPaymentFields(stripFreelancerPaymentOverrides({ ...req.body }), existing);
  if (body.clientId) body = await syncClientToProject(body);

  const project = await Project.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  })
    .populate("freelancerId", "name email")
    .populate("clientId", "name companyName email phone");

  if (project.isOutsourced && project.freelancerId) {
    if (shouldResetFreelancerPayment(existing, project)) {
      resetFreelancerPaymentFields(project);
    }
    syncProjectFreelancerPaymentFields(project);
    await project.save();
  } else if (!project.isOutsourced) {
    resetFreelancerPaymentFields(project);
    await project.save();
  }

  if (oldFreelancer !== newFreelancer) {
    if (oldFreelancer) await updateFreelancerCount(oldFreelancer, -1);
    if (newFreelancer) await updateFreelancerCount(newFreelancer, 1);
  }

  res.json({ success: true, data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  for (const att of project.attachments || []) {
    await deleteFromCloudinary(att.publicId);
  }
  if (project.freelancerId) await updateFreelancerCount(project.freelancerId, -1);

  await FreelancerPayment.deleteMany({ projectId: project._id });
  await Project.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: "Project deleted" });
});

const uploadProjectFiles = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  if (!req.files?.length) throw new ApiError(400, "No files uploaded");

  const uploads = await Promise.all(
    req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, "bluepeak/projects");
      return {
        fileName: file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        uploadedAt: new Date(),
      };
    })
  );

  project.attachments.push(...uploads);
  await project.save();

  res.json({ success: true, data: project });
});

module.exports = {
  getProjects,
  getProject,
  getProjectSummary,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectFiles,
};
