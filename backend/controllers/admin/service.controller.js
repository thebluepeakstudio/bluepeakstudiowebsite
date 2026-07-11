const mongoose = require("mongoose");
const Service = require("../../models/Service");
const Freelancer = require("../../models/Freelancer");
const Deliverable = require("../../models/Deliverable");
const ServicePayment = require("../../models/ServicePayment");
const Document = require("../../models/Document");
const DeliverableAssignment = require("../../models/DeliverableAssignment");
const Expense = require("../../models/Expense");
const FreelancerPayment = require("../../models/FreelancerPayment");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const { syncClientToProject } = require("../../utils/syncClientToProject");
const { normalizeServiceInput, withLegacyServiceFields } = require("../../utils/serviceCompat");
const { invalidateAnalyticsCache } = require("./analytics.controller");
const { aggregateClientOutstanding } = require("../../utils/clientOutstanding");
const { toSafeRegex } = require("../../utils/escapeRegex");
const {
  activeDeliverableFilter,
  buildServicesSummary,
  computeServiceProfit,
  deriveOverallStatus,
  sumDeliverablePrices,
  enrichServicesWithDeliverables,
} = require("../../services/serviceCalculations.service");
const {
  createDeliverable,
  updateDeliverable,
  softDeleteDeliverable,
  listDeliverables,
  createDeliverablesBatch,
  syncServiceWorkStatusFromDeliverables,
} = require("../../services/deliverable.service");
const {
  createAssignment,
  updateAssignment,
  softDeleteAssignment,
  createAssignmentsBatch,
  updateFreelancerCount,
} = require("../../services/deliverableAssignment.service");
const { generateServiceInvoicePdf } = require("../../services/invoice.service");
const {
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
  recomputeServicePaymentSummary,
  derivePaymentStatus,
  roundMoney,
} = require("../../services/servicePayment.service");
const {
  createRecurringService,
  buildRecurringServiceDetail,
} = require("../../services/recurringService.service");
const { runDaily, syncRecurringBillingForService } = require("../../services/recurringBillingJob.service");

const SERVICE_CONTAINER_FIELDS = [
  "clientId",
  "brandId",
  "clientName",
  "businessName",
  "contactNumber",
  "email",
  "name",
  "description",
  "category",
  "totalPrice",
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
  "workStatus",
  "notes",
  "googleDriveLink",
  "projectTitle",
  "projectDescription",
  "projectType",
  "totalAmount",
];

const pickContainerFields = (body) => {
  const normalized = normalizeServiceInput(body);
  const payload = {};
  SERVICE_CONTAINER_FIELDS.forEach((key) => {
    if (normalized[key] !== undefined) payload[key] = normalized[key];
  });
  if (payload.projectTitle && !payload.name) payload.name = payload.projectTitle;
  if (payload.projectDescription && !payload.description) payload.description = payload.projectDescription;
  if (payload.projectType && !payload.category) payload.category = payload.projectType;
  if (payload.totalAmount != null && payload.totalPrice == null) payload.totalPrice = payload.totalAmount;
  delete payload.projectTitle;
  delete payload.projectDescription;
  delete payload.projectType;
  delete payload.totalAmount;
  return payload;
};

const METADATA_ONLY_UPDATE_FIELDS = new Set([
  "notes",
  "googleDriveLink",
  "description",
  "name",
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
  "clientId",
  "brandId",
  "clientName",
  "businessName",
  "contactNumber",
  "email",
  "totalPrice",
]);

const normalizeFieldValue = (value) => {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value._id) return value._id.toString();
  return String(value);
};

const serviceFieldChanged = (key, body, existing) => {
  if (body[key] === undefined) return false;
  return normalizeFieldValue(body[key]) !== normalizeFieldValue(existing[key]);
};

const shouldSyncServiceWorkStatus = async (serviceId, body, existing) => {
  const deliverableCount = await Deliverable.countDocuments({
    serviceId,
    deletedAt: null,
  });
  if (!deliverableCount) return false;

  const changedKeys = SERVICE_CONTAINER_FIELDS.filter((key) =>
    serviceFieldChanged(key, body, existing)
  );
  if (!changedKeys.length) return false;

  return !changedKeys.every((key) => METADATA_ONLY_UPDATE_FIELDS.has(key));
};

const resolveServiceIncludeParam = (query) => {
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
  if (query.brandId) filter.brandId = query.brandId;
  if (query.search) {
    const pattern = toSafeRegex(query.search);
    if (pattern) {
      filter.$or = [
        { clientName: pattern },
        { name: pattern },
        { businessName: pattern },
        { email: pattern },
      ];
    }
  }
  return filter;
};

const getServices = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  if (req.query.category) {
    const RecurringDeliverableTemplate = require("../../models/RecurringDeliverableTemplate");
    const [fromDeliverables, fromTemplates] = await Promise.all([
      Deliverable.distinct("serviceId", {
        category: req.query.category,
        deletedAt: null,
      }),
      RecurringDeliverableTemplate.distinct("serviceId", {
        category: req.query.category,
        deletedAt: null,
      }),
    ]);
    const serviceIds = [...new Set([...fromDeliverables.map(String), ...fromTemplates.map(String)])];
    filter._id = { $in: serviceIds };
  }

  const [services, total] = await Promise.all([
    Service.find(filter)
      .select(
        "clientName businessName name category billingModel workStatus paymentStatus totalPrice remainingAmount advanceReceived dateOfOnboarding clientId brandId createdAt"
      )
      .populate("clientId", "name companyName email phone")
      .populate("brandId", "name logoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);

  const enriched = await enrichServicesWithDeliverables(services);

  res.json({
    success: true,
    data: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getServiceSummary = asyncHandler(async (req, res) => {
  const now = new Date();

  const [
    active,
    completed,
    waitingForClient,
    partialPayments,
    pendingPayments,
    deliverableStats,
  ] = await Promise.all([
    Service.countDocuments({ workStatus: { $nin: ["Completed", "Delivered"] } }),
    Service.countDocuments({ workStatus: { $in: ["Completed", "Delivered"] } }),
    Service.countDocuments({ workStatus: "Waiting for Client" }),
    Service.countDocuments({ paymentStatus: "Partial" }),
    aggregateClientOutstanding(),
    Deliverable.aggregate([
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
                    { $lt: ["$dueDate", now] },
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
      activeServices: active,
      completedProjects: completed,
      completedServices: completed,
      waitingForClientProjects: waitingForClient,
      partialPayments,
      pendingPayments: typeof pendingPayments === "number" ? pendingPayments : 0,
      deliverables: deliverableStats[0] || {
        inProgress: 0,
        review: 0,
        delivered: 0,
        delayed: 0,
      },
    },
  });
});

const buildServiceDetail = async (service, { withArrays = true } = {}) => {
  const legacy = withLegacyServiceFields(service);
  const deliverables = await listDeliverables(service._id);
  const payments = withArrays ? await listPayments(service._id) : [];
  const expenses = withArrays
    ? await Expense.find({ serviceId: service._id }).sort({ expenseDate: -1 }).lean()
    : [];

  const summary = deliverables.length
    ? buildServicesSummary(deliverables)
    : {
        services: legacy.category ? [legacy.category] : [],
        servicesCount: legacy.category ? 1 : 0,
        categories: legacy.category ? [legacy.category] : [],
      };

  const assignmentsByDeliverable = Object.fromEntries(
    deliverables.map((d) => [d._id.toString(), d.assignments || []])
  );
  const totalPrice = deliverables.length
    ? roundMoney(sumDeliverablePrices(deliverables))
    : roundMoney(legacy.totalPrice ?? legacy.totalAmount);
  const serviceProfit = deliverables.length
    ? await computeServiceProfit(service._id, deliverables, assignmentsByDeliverable, totalPrice)
    : totalPrice - (Number(legacy.outsourcingCost) || 0);

  const totalFreelancerCost = deliverables.reduce(
    (sum, d) => sum + (Number(d.freelancerCost) || 0),
    0
  );

  const overallStatus = deliverables.length
    ? deriveOverallStatus(deliverables)
    : legacy.workStatus;

  const totalReceived = roundMoney(legacy.advanceReceived);
  const remainingAmount = Math.max(0, roundMoney(totalPrice - totalReceived));
  const paymentStatus = derivePaymentStatus(totalReceived, totalPrice);

  const result = {
    ...legacy,
    ...summary,
    totalAmount: totalPrice,
    totalPrice,
    overallStatus,
    workStatus: overallStatus,
    totalReceived,
    remainingAmount,
    paymentStatus,
    advanceReceived: totalReceived,
    projectProfit: serviceProfit,
    serviceProfit,
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

const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)
    .select("-attachments")
    .populate("clientId", "name companyName email phone website")
    .populate("brandId", "name logoUrl industry")
    .lean();
  if (!service) throw new ApiError(404, "Service not found");

  if (service.billingModel === "recurring") {
    try {
      await syncRecurringBillingForService(service._id);
    } catch (err) {
      console.error("[recurring-billing] Service sync failed:", err.message);
    }
    const data = await buildRecurringServiceDetail(service);
    return res.json({ success: true, data });
  }

  const includeParam = resolveServiceIncludeParam(req.query);

  if (includeParam === "all") {
    const data = await buildServiceDetail(service, { withArrays: true });
    return res.json({ success: true, data });
  }

  const data = await buildServiceDetail(service, { withArrays: false });
  const includes = parseIncludeParam(includeParam);

  if (includes.has("deliverables")) {
    data.deliverables = await listDeliverables(service._id);
  }
  if (includes.has("payments")) {
    data.payments = await listPayments(service._id);
  }
  if (includes.has("expenses")) {
    data.expenses = await Expense.find({ serviceId: service._id })
      .sort({ expenseDate: -1 })
      .lean();
  }

  res.json({ success: true, data });
});

const createService = asyncHandler(async (req, res) => {
  const serviceData = req.body.service || req.body.project;
  const { deliverables, payments, config, templateDeliverables } = req.body;

  if (serviceData?.billingModel === "recurring") {
    const result = await createRecurringService(
      { service: serviceData, project: serviceData, config, templateDeliverables },
      req.admin.name
    );
    try {
      await runDaily();
    } catch (err) {
      console.error("[recurring-billing] Backfill after create failed:", err.message);
    }
    invalidateAnalyticsCache();
    return res.status(201).json({ success: true, data: { _id: result.service._id } });
  }

  if (!serviceData?.clientId) {
    throw new ApiError(400, "Client is required");
  }
  if (!deliverables?.length) {
    throw new ApiError(400, "At least one deliverable is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let body = pickContainerFields(serviceData);
    if (body.clientId) body = await syncClientToProject(body);
    if (body.totalPrice == null) body.totalPrice = 0;

    const service = new Service(body);
    await service.save({ session });

    const createdDeliverables = await createDeliverablesBatch(
      service._id,
      deliverables,
      session
    );

    for (let i = 0; i < createdDeliverables.length; i++) {
      const assignments = deliverables[i]?.assignments;
      if (assignments?.length) {
        await createAssignmentsBatch(createdDeliverables[i]._id, assignments, session);
      }
    }

    if (payments?.length) {
      for (const payment of payments) {
        await createPayment(service._id, payment, req.admin.name, session);
      }
    } else if (serviceData.advanceReceived > 0) {
      await createPayment(
        service._id,
        {
          amount: serviceData.advanceReceived,
          paymentDate: serviceData.advancePaymentDate,
          method: "UPI",
        },
        req.admin.name,
        session
      );
    } else {
      await recomputeServicePaymentSummary(service._id, session);
    }

    await session.commitTransaction();

    invalidateAnalyticsCache();
    res.status(201).json({ success: true, data: { _id: service._id } });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

const updateService = asyncHandler(async (req, res) => {
  const existing = await Service.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Service not found");

  let body = pickContainerFields(req.body);
  if (body.clientId) body = await syncClientToProject(body);

  const service = await Service.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  })
    .populate("clientId", "name companyName email phone")
    .populate("brandId", "name logoUrl")
    .lean();

  if (existing.billingModel === "recurring") {
    const data = await buildRecurringServiceDetail(service);
    invalidateAnalyticsCache();
    return res.json({ success: true, data });
  }

  if (await shouldSyncServiceWorkStatus(service._id, body, existing)) {
    await syncServiceWorkStatusFromDeliverables(service._id);
    const refreshed = await Service.findById(service._id)
      .populate("clientId", "name companyName email phone")
      .populate("brandId", "name logoUrl")
      .lean();
    const data = await buildServiceDetail(refreshed, { withArrays: false });
    invalidateAnalyticsCache();
    return res.json({ success: true, data });
  }

  const data = await buildServiceDetail(service, { withArrays: false });
  invalidateAnalyticsCache();
  res.json({ success: true, data });
});

const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, "Service not found");

  for (const att of service.attachments || []) {
    await deleteFromCloudinary(att.publicId);
  }

  const deliverableIds = await Deliverable.find({
    serviceId: service._id,
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

  const documents = await Document.find({ serviceId: service._id });
  for (const doc of documents) {
    await deleteFromCloudinary(doc.publicId, doc.resourceType || "image");
  }

  await Promise.all([
    Deliverable.updateMany({ serviceId: service._id }, { deletedAt: new Date() }),
    DeliverableAssignment.updateMany(
      { deliverableId: { $in: deliverableIds }, deletedAt: null },
      { deletedAt: new Date() }
    ),
    FreelancerPayment.deleteMany({ serviceId: service._id }),
    ServicePayment.deleteMany({ serviceId: service._id }),
    Document.deleteMany({ serviceId: service._id }),
    Expense.updateMany({ serviceId: service._id }, { $unset: { serviceId: 1 } }),
    Service.findByIdAndDelete(req.params.id),
  ]);

  invalidateAnalyticsCache();
  res.json({ success: true, message: "Service deleted" });
});

const uploadServiceFiles = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, "Service not found");

  if (!req.files?.length) throw new ApiError(400, "No files uploaded");

  const uploads = await Promise.all(
    req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, "bluepeak/services");
      return {
        fileName: file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        uploadedAt: new Date(),
      };
    })
  );

  service.attachments.push(...uploads);
  await service.save();

  res.json({ success: true, data: withLegacyServiceFields(service) });
});

const getServiceDeliverables = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, "Service not found");
  const data = await listDeliverables(req.params.id);
  res.json({ success: true, data });
});

const postServiceDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await createDeliverable(req.params.id, req.body);
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: deliverable });
});

const putServiceDeliverable = asyncHandler(async (req, res) => {
  const deliverable = await updateDeliverable(req.params.id, req.params.deliverableId, req.body);
  invalidateAnalyticsCache();
  res.json({ success: true, data: deliverable });
});

const deleteServiceDeliverable = asyncHandler(async (req, res) => {
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

const getServicePayments = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, "Service not found");
  const payments = await listPayments(req.params.id);
  res.json({ success: true, data: payments });
});

const postServicePayment = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).select("billingModel").lean();
  if (!service) throw new ApiError(404, "Service not found");
  if (service.billingModel === "recurring") {
    throw new ApiError(
      400,
      "Recurring services use client payments with automatic invoice allocation"
    );
  }
  const payment = await createPayment(req.params.id, req.body, req.admin.name);
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: payment });
});

const putServicePayment = asyncHandler(async (req, res) => {
  const payment = await updatePayment(req.params.id, req.params.paymentId, req.body);
  invalidateAnalyticsCache();
  res.json({ success: true, data: payment });
});

const deleteServicePayment = asyncHandler(async (req, res) => {
  await deletePayment(req.params.id, req.params.paymentId);
  invalidateAnalyticsCache();
  res.json({ success: true, message: "Payment deleted" });
});

const getServiceInvoice = asyncHandler(async (req, res) => {
  const { buffer, fileName } = await generateServiceInvoicePdf(req.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
});

const getServiceExpenses = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw new ApiError(404, "Service not found");
  const expenses = await Expense.find({ serviceId: req.params.id })
    .sort({ expenseDate: -1 })
    .lean();
  res.json({ success: true, data: expenses });
});

module.exports = {
  getServices,
  getService,
  getServiceSummary,
  createService,
  updateService,
  deleteService,
  uploadServiceFiles,
  getServiceDeliverables,
  postServiceDeliverable,
  putServiceDeliverable,
  deleteServiceDeliverable,
  postAssignment,
  putAssignment,
  deleteAssignment,
  getServicePayments,
  postServicePayment,
  putServicePayment,
  deleteServicePayment,
  getServiceInvoice,
  getServiceExpenses,
  getProjects: getServices,
  getProject: getService,
  getProjectSummary: getServiceSummary,
  createProject: createService,
  updateProject: updateService,
  deleteProject: deleteService,
  uploadProjectFiles: uploadServiceFiles,
  getProjectDeliverables: getServiceDeliverables,
  postProjectDeliverable: postServiceDeliverable,
  putProjectDeliverable: putServiceDeliverable,
  deleteProjectDeliverable: deleteServiceDeliverable,
  getProjectPayments: getServicePayments,
  postProjectPayment: postServicePayment,
  putProjectPayment: putServicePayment,
  deleteProjectPayment: deleteServicePayment,
  getProjectInvoice: getServiceInvoice,
  getProjectExpenses: getServiceExpenses,
};
