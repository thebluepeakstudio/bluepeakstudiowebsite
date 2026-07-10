const Client = require("../../models/Client");
const ClientActivity = require("../../models/ClientActivity");
const ClientAttachment = require("../../models/ClientAttachment");
const Project = require("../../models/Project");
const Service = require("../../models/Service");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const {
  enrichProjectsWithDeliverables: enrichLegacyProjects,
} = require("../../services/projectCalculations.service");
const {
  enrichServicesWithDeliverables,
} = require("../../services/serviceCalculations.service");

const CLIENT_FIELDS = [
  "name",
  "companyName",
  "email",
  "phone",
  "website",
  "address",
  "notes",
  "status",
  "tags",
];

const pickClientFields = (body) => {
  const payload = {};
  CLIENT_FIELDS.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  return payload;
};

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { companyName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { phone: { $regex: query.search, $options: "i" } },
    ];
  }
  return filter;
};

const SERVICE_LIST_SELECT =
  "clientName businessName name category billingModel workStatus paymentStatus totalPrice remainingAmount createdAt legacyProjectId";

const LEGACY_PROJECT_SELECT =
  "clientName businessName projectType projectTitle workStatus paymentStatus totalAmount createdAt";

const listClientLinkedProjects = async (clientId) => {
  const [services, legacyProjects] = await Promise.all([
    Service.find({ clientId })
      .select(SERVICE_LIST_SELECT)
      .sort({ createdAt: -1 })
      .lean(),
    Project.find({ clientId }).select(LEGACY_PROJECT_SELECT).sort({ createdAt: -1 }).lean(),
  ]);

  const migratedLegacyIds = new Set(
    services.map((s) => String(s.legacyProjectId || "")).filter(Boolean)
  );
  const unmigratedProjects = legacyProjects.filter(
    (p) => !migratedLegacyIds.has(String(p._id))
  );

  const [enrichedServices, enrichedLegacy] = await Promise.all([
    enrichServicesWithDeliverables(services),
    unmigratedProjects.length ? enrichLegacyProjects(unmigratedProjects) : [],
  ]);

  return [...enrichedServices, ...enrichedLegacy].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

const getClients = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  const [clients, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Client.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: clients,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");
  res.json({ success: true, data: client });
});

const getClientProjects = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const projects = await listClientLinkedProjects(req.params.id);
  res.json({ success: true, data: projects });
});

const getClientActivities = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const activities = await ClientActivity.find({ clientId: req.params.id }).sort({
    occurredAt: -1,
  });
  res.json({ success: true, data: activities });
});

const getClientAttachments = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const attachments = await ClientAttachment.find({ clientId: req.params.id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, data: attachments });
});

const getClientOverview = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const [projects, activities, attachments] = await Promise.all([
    listClientLinkedProjects(req.params.id),
    ClientActivity.find({ clientId: req.params.id }).sort({ occurredAt: -1 }),
    ClientAttachment.find({ clientId: req.params.id }).sort({ createdAt: -1 }),
  ]);

  res.json({
    success: true,
    data: { client, projects, activities, attachments },
  });
});

const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create(pickClientFields(req.body));
  res.status(201).json({ success: true, data: client });
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, pickClientFields(req.body), {
    new: true,
    runValidators: true,
  });
  if (!client) throw new ApiError(404, "Client not found");
  res.json({ success: true, data: client });
});

const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const [projectCount, serviceCount] = await Promise.all([
    Project.countDocuments({ clientId: client._id }),
    Service.countDocuments({ clientId: client._id }),
  ]);
  if (projectCount > 0 || serviceCount > 0) {
    throw new ApiError(400, "Cannot delete client with linked projects");
  }

  const attachments = await ClientAttachment.find({ clientId: client._id });
  await Promise.all(
    attachments.map((a) => (a.publicId ? deleteFromCloudinary(a.publicId) : null))
  );
  await ClientActivity.deleteMany({ clientId: client._id });
  await ClientAttachment.deleteMany({ clientId: client._id });
  await Client.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: "Client deleted" });
});

const logClientActivity = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");

  const activity = await ClientActivity.create({
    clientId: client._id,
    type: req.body.type,
    title: req.body.title,
    body: req.body.body,
    occurredAt: req.body.occurredAt || new Date(),
    dueDate: req.body.dueDate,
    createdBy: req.admin.name,
    createdById: req.admin._id,
  });

  res.status(201).json({ success: true, data: activity });
});

const uploadClientAttachments = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new ApiError(404, "Client not found");
  if (!req.files?.length) throw new ApiError(400, "No files uploaded");

  const docs = await Promise.all(
    req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, "bluepeak/clients");
      return ClientAttachment.create({
        clientId: client._id,
        fileName: file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        uploadedBy: req.admin.name,
      });
    })
  );

  res.status(201).json({ success: true, data: docs });
});

const deleteClientAttachment = asyncHandler(async (req, res) => {
  const attachment = await ClientAttachment.findById(req.params.attachmentId);
  if (!attachment || attachment.clientId.toString() !== req.params.id) {
    throw new ApiError(404, "Attachment not found");
  }

  if (attachment.publicId) await deleteFromCloudinary(attachment.publicId);
  await ClientAttachment.findByIdAndDelete(attachment._id);

  res.json({ success: true, message: "Attachment deleted" });
});

module.exports = {
  getClients,
  getClient,
  getClientOverview,
  getClientProjects,
  getClientActivities,
  getClientAttachments,
  createClient,
  updateClient,
  deleteClient,
  logClientActivity,
  uploadClientAttachments,
  deleteClientAttachment,
};
