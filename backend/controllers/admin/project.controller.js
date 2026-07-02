const mongoose = require("mongoose");
const Project = require("../../models/Project");
const Freelancer = require("../../models/Freelancer");
const ProjectDeliverable = require("../../models/ProjectDeliverable");
const ProjectPayment = require("../../models/ProjectPayment");
const Document = require("../../models/Document");
const DeliverableAssignment = require("../../models/DeliverableAssignment");
const Expense = require("../../models/Expense");
const FreelancerPayment = require("../../models/FreelancerPayment");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const { syncClientToProject } = require("../../utils/syncClientToProject");
const { invalidateAnalyticsCache } = require("./analytics.controller");
const {
  activeDeliverableFilter,
  buildServicesSummary,
  computeProjectProfit,
  deriveOverallStatus,
  sumDeliverablePrices,
  enrichProjectsWithDeliverables,
} = require("../../services/projectCalculations.service");
const {
  createDeliverable,
  updateDeliverable,
  softDeleteDeliverable,
  listDeliverables,
  createDeliverablesBatch,
  syncProjectFromDeliverables,
} = require("../../services/projectDeliverable.service");
const {
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  createAssignmentsBatch,
  updateFreelancerCount,
} = require("../../services/deliverableAssignment.service");
const { generateProjectInvoicePdf } = require("../../services/invoice.service");
const {
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
  recomputeProjectPaymentSummary,
  derivePaymentStatus,
  roundMoney,
} = require("../../services/projectPayment.service");

const PROJECT_CONTAINER_FIELDS = [
  "clientId",
  "clientName",
  "businessName",
  "contactNumber",
  "email",
  "projectTitle",
  "projectDescription",
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
  "workStatus",
  "notes",
  "googleDriveLink",
];

const pickContainerFields = (body) => {
  const payload = {};
  PROJECT_CONTAINER_FIELDS.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  return payload;
};

const METADATA_ONLY_UPDATE_FIELDS = new Set([
  "notes",
  "googleDriveLink",
  "projectDescription",
  "projectTitle",
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
  "clientId",
  "clientName",
  "businessName",
  "contactNumber",
  "email",
]);

const normalizeFieldValue = (value) => {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value._id) return value._id.toString();
  return String(value);
};

const projectFieldChanged = (key, body, existing) => {
  if (body[key] === undefined) return false;
  return normalizeFieldValue(body[key]) !== normalizeFieldValue(existing[key]);
};

/** Skip deliverable sync when only metadata changed — preserves workStatus re-derive on status edits. */
const shouldSyncProjectFromDeliverables = async (projectId, body, existing) => {
  const deliverableCount = await ProjectDeliverable.countDocuments({
    projectId,
    deletedAt: null,
  });
  if (!deliverableCount) return false;

  const changedKeys = PROJECT_CONTAINER_FIELDS.filter((key) =>
    projectFieldChanged(key, body, existing)
  );
  if (!changedKeys.length) return false;

  return !changedKeys.every((key) => METADATA_ONLY_UPDATE_FIELDS.has(key));
};

const resolveProjectIncludeParam = (query) => {
  if (query.fields === "full" || query.fields === "all") return "all";
  if (query.fields === "summary") return query.include || undefined;
  return query.include;
};

const buildFilter = (query) => {
  const filter = {};
  if (query.workStatus) filter.workStatus = query.workStatus;
  if (query.paymentStatus) {
    filter.paymentStatus =
      query.paymentStatus === "Unpaid"
        ? { $in: ["Unpaid", "Pending"] }
        : query.paymentStatus;
  }
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

const getProjects = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  let projectIdsFilter = null;
  if (req.query.category) {
    projectIdsFilter = await ProjectDeliverable.distinct("projectId", {
      category: req.query.category,
      deletedAt: null,
    });
    filter._id = { $in: projectIdsFilter };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .select(
        "clientName businessName projectTitle projectType workStatus paymentStatus totalAmount remainingAmount advanceReceived dateOfOnboarding clientId createdAt"
      )
      .populate("clientId", "name companyName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  const enriched = await enrichProjectsWithDeliverables(projects);

  res.json({
    success: true,
    data: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getProjectSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    active,
    completed,
    waitingForClient,
    partialPayments,
    pendingPayments,
    deliverableStats,
  ] = await Promise.all([
    Project.countDocuments({ workStatus: { $nin: ["Completed", "Delivered"] } }),
    Project.countDocuments({ workStatus: { $in: ["Completed", "Delivered"] } }),
    Project.countDocuments({ workStatus: "Waiting for Client" }),
    Project.countDocuments({ paymentStatus: "Partial" }),
    Project.aggregate([
      { $match: { paymentStatus: { $ne: "Paid" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]),
    ProjectDeliverable.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          review: { $sum: { $cond: [{ $eq: ["$status", "Review"] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] } },
          delayed: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$expectedCompletion", now] },
                    { $ne: ["$status", "Delivered"] },
                    { $ne: ["$status", "Cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      activeProjects: active,
      completedProjects: completed,
      waitingForClientProjects: waitingForClient,
      partialPayments,
      pendingPayments: pendingPayments[0]?.total || 0,
      deliverables: deliverableStats[0] || {
        inProgress: 0,
        review: 0,
        delivered: 0,
        delayed: 0,
      },
    },
  });
});

const buildProjectDetail = async (project, { withArrays = true } = {}) => {
  const deliverables = await listDeliverables(project._id);
  const payments = withArrays ? await listPayments(project._id) : [];
  const expenses = withArrays
    ? await Expense.find({ projectId: project._id }).sort({ expenseDate: -1 }).lean()
    : [];

  const summary = deliverables.length
    ? buildServicesSummary(deliverables)
    : {
        services: project.projectType ? [project.projectType] : [],
        servicesCount: project.projectType ? 1 : 0,
        categories: project.projectType ? [project.projectType] : [],
      };

  const assignmentsByDeliverable = Object.fromEntries(
    deliverables.map((d) => [d._id.toString(), d.assignments || []])
  );
  const projectProfit = deliverables.length
    ? await computeProjectProfit(project._id, deliverables, assignmentsByDeliverable)
    : (Number(project.totalAmount) || 0) - (Number(project.outsourcingCost) || 0);

  const totalFreelancerCost = deliverables.reduce(
    (sum, d) => sum + (Number(d.freelancerCost) || 0),
    0
  );

  const totalAmount = deliverables.length
    ? sumDeliverablePrices(deliverables)
    : Number(project.totalAmount) || 0;
  const overallStatus = deliverables.length
    ? deriveOverallStatus(deliverables)
    : project.workStatus;

  const totalReceived = roundMoney(project.advanceReceived);
  const remainingAmount = Math.max(0, roundMoney(totalAmount - totalReceived));
  const paymentStatus = derivePaymentStatus(totalReceived, totalAmount);

  const result = {
    ...project,
    ...summary,
    totalAmount,
    overallStatus,
    workStatus: overallStatus,
    totalReceived,
    remainingAmount,
    paymentStatus,
    advanceReceived: totalReceived,
    projectProfit,
    totalFreelancerCost,
    deliverableProfitTotal: deliverables.reduce((sum, d) => sum + (Number(d.profit) || 0), 0),
  };

  if (withArrays) {
    result.deliverables = deliverables;
    result.payments = payments;
    result.expenses = expenses;
  }

  return result;
};

const parseIncludeParam = (includeParam) => {
  if (!includeParam || includeParam === "summary") return new Set();
  if (includeParam === "all") return new Set(["deliverables", "payments", "expenses"]);
  return new Set(
    String(includeParam)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
};

const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .select("-attachments")
    .populate("clientId", "name companyName email phone website")
    .lean();
  if (!project) throw new ApiError(404, "Project not found");

  const includeParam = resolveProjectIncludeParam(req.query);

  if (includeParam === "all") {
    const data = await buildProjectDetail(project, { withArrays: true });
    return res.json({ success: true, data });
  }

  const data = await buildProjectDetail(project, { withArrays: false });
  const includes = parseIncludeParam(includeParam);

  if (includes.has("deliverables")) {
    data.deliverables = await listDeliverables(project._id);
  }
  if (includes.has("payments")) {
    data.payments = await listPayments(project._id);
  }
  if (includes.has("expenses")) {
    data.expenses = await Expense.find({ projectId: project._id })
      .sort({ expenseDate: -1 })
      .lean();
  }

  res.json({ success: true, data });
});

const createProject = asyncHandler(async (req, res) => {
  const { project: projectData, deliverables, payments } = req.body;

  if (!projectData?.clientId) {
    throw new ApiError(400, "Client is required");
  }
  if (!deliverables?.length) {
    throw new ApiError(400, "At least one deliverable is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let body = pickContainerFields(projectData);
    if (body.clientId) body = await syncClientToProject(body);

    const project = new Project(body);
    await project.save({ session });

    const createdDeliverables = await createDeliverablesBatch(
      project._id,
      deliverables,
      session
    );

    for (let i = 0; i < createdDeliverables.length; i++) {
      const assignments = deliverables[i]?.assignments;
      if (assignments?.length) {
        await createAssignmentsBatch(createdDeliverables[i]._id, assignments, session);
      }
    }

    await syncProjectFromDeliverables(project._id, session);

    if (payments?.length) {
      for (const payment of payments) {
        await createPayment(project._id, payment, req.admin.name, session);
      }
    } else if (projectData.advanceReceived > 0) {
      await createPayment(
        project._id,
        {
          amount: projectData.advanceReceived,
          paymentDate: projectData.advancePaymentDate,
          method: "UPI",
        },
        req.admin.name,
        session
      );
    } else {
      await recomputeProjectPaymentSummary(project._id, session);
    }

    await session.commitTransaction();

    invalidateAnalyticsCache();
    res.status(201).json({ success: true, data: { _id: project._id } });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

const updateProject = asyncHandler(async (req, res) => {
  const existing = await Project.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Project not found");

  let body = pickContainerFields(req.body);
  if (body.clientId) body = await syncClientToProject(body);

  const project = await Project.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  })
    .populate("clientId", "name companyName email phone")
    .lean();

  if (await shouldSyncProjectFromDeliverables(project._id, body, existing)) {
    await syncProjectFromDeliverables(project._id);
    const refreshed = await Project.findById(project._id)
      .populate("clientId", "name companyName email phone")
      .lean();
    const data = await buildProjectDetail(refreshed, { withArrays: false });
    invalidateAnalyticsCache();
    return res.json({ success: true, data });
  }

  const data = await buildProjectDetail(project, { withArrays: false });
  invalidateAnalyticsCache();
  res.json({ success: true, data });
});

const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  for (const att of project.attachments || []) {
    await deleteFromCloudinary(att.publicId);
  }

  const deliverableIds = await ProjectDeliverable.find({
    projectId: project._id,
    deletedAt: null,
  }).distinct("_id");

  if (deliverableIds.length) {
    const decrementByFreelancer = await DeliverableAssignment.aggregate([
      { $match: { deliverableId: { $in: deliverableIds }, deletedAt: null } },
      { $group: { _id: "$freelancerId", count: { $sum: 1 } } },
    ]);
    if (decrementByFreelancer.length) {
      await Freelancer.bulkWrite(
        decrementByFreelancer.map((row) => ({
          updateOne: {
            filter: { _id: row._id },
            update: { $inc: { totalProjectsAssigned: -row.count } },
          },
        }))
      );
    }
  }

  const documents = await Document.find({ projectId: project._id });
  for (const doc of documents) {
    await deleteFromCloudinary(doc.publicId, doc.resourceType || "image");
  }

  await Promise.all([
    ProjectDeliverable.updateMany({ projectId: project._id }, { deletedAt: new Date() }),
    DeliverableAssignment.updateMany(
      { deliverableId: { $in: deliverableIds }, deletedAt: null },
      { deletedAt: new Date() }
    ),
    FreelancerPayment.deleteMany({ projectId: project._id }),
    ProjectPayment.deleteMany({ projectId: project._id }),
    Document.deleteMany({ projectId: project._id }),
    Expense.updateMany({ projectId: project._id }, { $unset: { projectId: 1 } }),
    Project.findByIdAndDelete(req.params.id),
  ]);

  invalidateAnalyticsCache();
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

const getProjectDeliverables = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");
  const data = await listDeliverables(req.params.id);
  res.json({ success: true, data });
});

const postProjectDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await createDeliverable(req.params.id, req.body);
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: deliverable });
});

const putProjectDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await updateDeliverable(req.params.id, req.params.deliverableId, req.body);
  invalidateAnalyticsCache();
  res.json({ success: true, data: deliverable });
});

const deleteProjectDeliverable = asyncHandler(async (req, res) => {
  await softDeleteDeliverable(req.params.id, req.params.deliverableId);
  invalidateAnalyticsCache();
  res.json({ success: true, message: "Deliverable deleted" });
});

const postAssignment = asyncHandler(async (req, res) => {
  const assignment = await createAssignment(
    req.params.id,
    req.params.deliverableId,
    req.body
  );
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: assignment });
});

const putAssignment = asyncHandler(async (req, res) => {
  const assignment = await updateAssignment(
    req.params.id,
    req.params.deliverableId,
    req.params.assignmentId,
    req.body
  );
  invalidateAnalyticsCache();
  res.json({ success: true, data: assignment });
});

const deleteAssignment = asyncHandler(async (req, res) => {
  await softDeleteAssignment(
    req.params.id,
    req.params.deliverableId,
    req.params.assignmentId
  );
  invalidateAnalyticsCache();
  res.json({ success: true, message: "Assignment removed" });
});

const getProjectPayments = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");
  const payments = await listPayments(req.params.id);
  res.json({ success: true, data: payments });
});

const postProjectPayment = asyncHandler(async (req, res) => {
  const payment = await createPayment(req.params.id, req.body, req.admin.name);
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: payment });
});

const putProjectPayment = asyncHandler(async (req, res) => {
  const payment = await updatePayment(req.params.id, req.params.paymentId, req.body);
  invalidateAnalyticsCache();
  res.json({ success: true, data: payment });
});

const deleteProjectPayment = asyncHandler(async (req, res) => {
  await deletePayment(req.params.id, req.params.paymentId);
  invalidateAnalyticsCache();
  res.json({ success: true, message: "Payment deleted" });
});

const getProjectInvoice = asyncHandler(async (req, res) => {
  const { buffer, fileName } = await generateProjectInvoicePdf(req.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
});

const getProjectExpenses = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");
  const expenses = await Expense.find({ projectId: req.params.id })
    .sort({ expenseDate: -1 })
    .lean();
  res.json({ success: true, data: expenses });
});

module.exports = {
  getProjects,
  getProject,
  getProjectSummary,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectFiles,
  getProjectDeliverables,
  postProjectDeliverable,
  putProjectDeliverable,
  deleteProjectDeliverable,
  postAssignment,
  putAssignment,
  deleteAssignment,
  getProjectPayments,
  postProjectPayment,
  putProjectPayment,
  deleteProjectPayment,
  getProjectInvoice,
  getProjectExpenses,
};
