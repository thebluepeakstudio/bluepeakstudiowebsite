const Lead = require("../../models/Lead");
const { LEAD_STAGES } = require("../../models/Lead");
const LeadActivity = require("../../models/LeadActivity");
const LeadStatusHistory = require("../../models/LeadStatusHistory");
const LeadAttachment = require("../../models/LeadAttachment");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const { convertLeadToClient } = require("../../services/leadConversion.service");

const LEAD_FIELDS = [
  "fullName",
  "companyName",
  "email",
  "phone",
  "website",
  "leadSource",
  "status",
  "priority",
  "estimatedProjectValue",
  "assignedTo",
  "tags",
  "requirements",
  "notes",
  "lastContactDate",
  "nextFollowUpDate",
  "followUpStatus",
  "reminderNotes",
];

const pickLeadFields = (body) => {
  const payload = {};
  LEAD_FIELDS.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  if (payload.assignedTo === "") payload.assignedTo = null;
  return payload;
};

const recordStatusChange = async (lead, toStatus, admin, note) => {
  if (lead.status === toStatus) return;
  await LeadStatusHistory.create({
    leadId: lead._id,
    fromStatus: lead.status,
    toStatus,
    changedBy: admin.name,
    changedById: admin._id,
    note,
  });
};

const buildFilter = (query) => {
  const filter = {};
  if (query.status) {
    const statuses = String(query.status).split(",").filter(Boolean);
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (query.priority) filter.priority = query.priority;
  if (query.leadSource) filter.leadSource = query.leadSource;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.tag) filter.tags = query.tag;
  if (query.search) {
    filter.$or = [
      { fullName: { $regex: query.search, $options: "i" } },
      { companyName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { phone: { $regex: query.search, $options: "i" } },
    ];
  }
  if (query.followUpFrom || query.followUpTo) {
    filter.nextFollowUpDate = {};
    if (query.followUpFrom) filter.nextFollowUpDate.$gte = new Date(query.followUpFrom);
    if (query.followUpTo) filter.nextFollowUpDate.$lte = new Date(query.followUpTo);
  }
  return filter;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const getLeads = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);
  const sort = req.query.sort === "value" ? { estimatedProjectValue: -1 } : { createdAt: -1 };

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("assignedTo", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: leads,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getKanban = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const leads = await Lead.find(filter)
    .select(
      "fullName companyName priority estimatedProjectValue nextFollowUpDate status assignedTo updatedAt"
    )
    .populate("assignedTo", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  const grouped = {};
  LEAD_STAGES.forEach((s) => {
    grouped[s] = [];
  });
  leads.forEach((l) => {
    if (grouped[l.status]) grouped[l.status].push(l);
  });

  res.json({ success: true, data: grouped });
});

const getLeadMetrics = asyncHandler(async (req, res) => {
  const openStatuses = LEAD_STAGES.filter((s) => !["Won", "Lost"].includes(s));

  const [facetResult] = await Lead.aggregate([
    {
      $facet: {
        total: [{ $count: "count" }],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        pipeline: [
          { $match: { status: { $in: openStatuses } } },
          { $group: { _id: null, total: { $sum: "$estimatedProjectValue" } } },
        ],
        bySource: [
          { $group: { _id: "$leadSource", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]);

  const statusMap = Object.fromEntries(
    (facetResult.byStatus || []).map((row) => [row._id, row.count])
  );
  const totalLeads = facetResult.total[0]?.count || 0;
  const newLeads = statusMap.New || 0;
  const qualifiedLeads = statusMap.Qualified || 0;
  const wonLeads = statusMap.Won || 0;
  const lostLeads = statusMap.Lost || 0;
  const pipelineAgg = facetResult.pipeline;
  const bySource = facetResult.bySource;

  const closed = wonLeads + lostLeads;
  const conversionRate = closed > 0 ? Math.round((wonLeads / closed) * 1000) / 10 : 0;

  res.json({
    success: true,
    data: {
      totalLeads,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      pipelineValue: pipelineAgg[0]?.total || 0,
      leadsBySource: bySource.map((r) => ({ source: r._id, count: r.count })),
    },
  });
});

const buildFollowUpFilter = (due) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const filter = {
    nextFollowUpDate: { $exists: true, $ne: null },
    followUpStatus: { $ne: "Completed" },
  };

  if (due === "today") {
    filter.nextFollowUpDate = { $gte: todayStart, $lte: todayEnd };
  } else if (due === "upcoming") {
    filter.nextFollowUpDate = { $gt: todayEnd, $lte: weekEnd };
  } else if (due === "overdue") {
    filter.nextFollowUpDate = { $lt: todayStart };
  }

  return filter;
};

const queryFollowUps = (due) =>
  Lead.find(buildFollowUpFilter(due))
    .select("fullName nextFollowUpDate reminderNotes followUpStatus")
    .sort({ nextFollowUpDate: 1 })
    .limit(20)
    .lean();

const getFollowUps = asyncHandler(async (req, res) => {
  const due = req.query.due || "today";

  if (due === "all") {
    const [today, upcoming, overdue] = await Promise.all([
      queryFollowUps("today"),
      queryFollowUps("upcoming"),
      queryFollowUps("overdue"),
    ]);
    return res.json({ success: true, data: { today, upcoming, overdue } });
  }

  const leads = await queryFollowUps(due);
  res.json({ success: true, data: leads });
});

const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate("assignedTo", "name email")
    .populate("convertedClientId", "name companyName");
  if (!lead) throw new ApiError(404, "Lead not found");
  res.json({ success: true, data: lead });
});

const getLeadOverview = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate("assignedTo", "name email")
    .populate("convertedClientId", "name companyName");
  if (!lead) throw new ApiError(404, "Lead not found");

  const [activities, attachments, history] = await Promise.all([
    LeadActivity.find({ leadId: lead._id }).sort({ occurredAt: -1 }),
    LeadAttachment.find({ leadId: lead._id }).sort({ createdAt: -1 }),
    LeadStatusHistory.find({ leadId: lead._id }).sort({ createdAt: -1 }),
  ]);

  res.json({
    success: true,
    data: { lead, activities, attachments, history },
  });
});

const createLead = asyncHandler(async (req, res) => {
  const body = pickLeadFields(req.body);
  const lead = await Lead.create(body);
  await LeadStatusHistory.create({
    leadId: lead._id,
    fromStatus: null,
    toStatus: lead.status,
    changedBy: req.admin.name,
    changedById: req.admin._id,
    note: "Lead created",
  });
  const populated = await Lead.findById(lead._id).populate("assignedTo", "name email");
  res.status(201).json({ success: true, data: populated });
});

const updateLead = asyncHandler(async (req, res) => {
  const existing = await Lead.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Lead not found");
  if (existing.isConverted) throw new ApiError(400, "Converted leads cannot be edited");

  const body = pickLeadFields(req.body);
  if (body.status && body.status !== existing.status) {
    await recordStatusChange(existing, body.status, req.admin, req.body.statusNote);
  }

  const lead = await Lead.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  }).populate("assignedTo", "name email");

  res.json({ success: true, data: lead });
});

const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.isConverted) throw new ApiError(400, "Converted leads are locked");

  const { status, note } = req.body;
  await recordStatusChange(lead, status, req.admin, note);
  lead.status = status;
  await lead.save();

  const updated = await Lead.findById(lead._id).populate("assignedTo", "name email");
  res.json({ success: true, data: updated });
});

const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.isConverted) throw new ApiError(400, "Converted leads cannot be deleted");

  const attachments = await LeadAttachment.find({ leadId: lead._id });
  await Promise.all(
    attachments.map((a) => (a.publicId ? deleteFromCloudinary(a.publicId) : null))
  );
  await LeadActivity.deleteMany({ leadId: lead._id });
  await LeadStatusHistory.deleteMany({ leadId: lead._id });
  await LeadAttachment.deleteMany({ leadId: lead._id });
  await Lead.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: "Lead deleted" });
});

const bulkAction = asyncHandler(async (req, res) => {
  const { action, ids, payload = {} } = req.body;
  const leads = await Lead.find({ _id: { $in: ids }, isConverted: false });
  if (!leads.length) throw new ApiError(400, "No eligible leads selected");

  const leadIds = leads.map((l) => l._id);

  if (action === "delete") {
    for (const lead of leads) {
      const attachments = await LeadAttachment.find({ leadId: lead._id });
      await Promise.all(
        attachments.map((a) => (a.publicId ? deleteFromCloudinary(a.publicId) : null))
      );
    }
    await LeadActivity.deleteMany({ leadId: { $in: leadIds } });
    await LeadStatusHistory.deleteMany({ leadId: { $in: leadIds } });
    await LeadAttachment.deleteMany({ leadId: { $in: leadIds } });
    await Lead.deleteMany({ _id: { $in: leadIds } });
    return res.json({ success: true, message: `${leadIds.length} leads deleted` });
  }

  if (action === "updateStatus") {
    for (const lead of leads) {
      await recordStatusChange(lead, payload.status, req.admin);
      lead.status = payload.status;
      await lead.save();
    }
    return res.json({ success: true, message: "Status updated" });
  }

  if (action === "assign") {
    await Lead.updateMany(
      { _id: { $in: leadIds } },
      { assignedTo: payload.assignedTo || null }
    );
    return res.json({ success: true, message: "Assignee updated" });
  }

  if (action === "addTags") {
    await Lead.updateMany({ _id: { $in: leadIds } }, { $addToSet: { tags: payload.tag } });
    return res.json({ success: true, message: "Tags added" });
  }

  if (action === "setPriority") {
    await Lead.updateMany({ _id: { $in: leadIds } }, { priority: payload.priority });
    return res.json({ success: true, message: "Priority updated" });
  }

  throw new ApiError(400, "Unknown action");
});

const getLeadActivities = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");
  const activities = await LeadActivity.find({ leadId: lead._id }).sort({ occurredAt: -1 });
  res.json({ success: true, data: activities });
});

const logLeadActivity = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");

  const activity = await LeadActivity.create({
    leadId: lead._id,
    type: req.body.type,
    title: req.body.title,
    body: req.body.body,
    occurredAt: req.body.occurredAt || new Date(),
    dueDate: req.body.dueDate,
    createdBy: req.admin.name,
    createdById: req.admin._id,
  });

  lead.lastContactDate = activity.occurredAt;
  await lead.save();

  res.status(201).json({ success: true, data: activity });
});

const getLeadStatusHistory = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");
  const history = await LeadStatusHistory.find({ leadId: lead._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: history });
});

const getLeadAttachments = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");
  const attachments = await LeadAttachment.find({ leadId: lead._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: attachments });
});

const uploadLeadAttachments = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");
  if (!req.files?.length) throw new ApiError(400, "No files uploaded");

  const docs = await Promise.all(
    req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, "bluepeak/leads");
      return LeadAttachment.create({
        leadId: lead._id,
        fileName: file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        uploadedBy: req.admin.name,
      });
    })
  );

  res.status(201).json({ success: true, data: docs });
});

const deleteLeadAttachment = asyncHandler(async (req, res) => {
  const attachment = await LeadAttachment.findById(req.params.attachmentId);
  if (!attachment || attachment.leadId.toString() !== req.params.id) {
    throw new ApiError(404, "Attachment not found");
  }
  if (attachment.publicId) await deleteFromCloudinary(attachment.publicId);
  await LeadAttachment.findByIdAndDelete(attachment._id);
  res.json({ success: true, message: "Attachment deleted" });
});

const updateFollowUp = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, "Lead not found");

  const { nextFollowUpDate, reminderNotes, followUpStatus, followUpNotes } = req.body;

  if (nextFollowUpDate !== undefined) lead.nextFollowUpDate = nextFollowUpDate || null;
  if (reminderNotes !== undefined) lead.reminderNotes = reminderNotes;
  if (followUpStatus !== undefined) lead.followUpStatus = followUpStatus;

  if (followUpNotes || nextFollowUpDate) {
    lead.followUpHistory.push({
      scheduledAt: nextFollowUpDate || lead.nextFollowUpDate,
      status: followUpStatus || lead.followUpStatus,
      notes: followUpNotes || reminderNotes,
      completedAt: followUpStatus === "Completed" ? new Date() : undefined,
    });
  }

  await lead.save();
  const updated = await Lead.findById(lead._id).populate("assignedTo", "name email");
  res.json({ success: true, data: updated });
});

const convertLead = asyncHandler(async (req, res) => {
  const result = await convertLeadToClient(req.params.id, req.admin);
  res.json({ success: true, data: result });
});

module.exports = {
  getLeads,
  getKanban,
  getLeadMetrics,
  getFollowUps,
  getLead,
  getLeadOverview,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  bulkAction,
  getLeadActivities,
  logLeadActivity,
  getLeadStatusHistory,
  getLeadAttachments,
  uploadLeadAttachments,
  deleteLeadAttachment,
  updateFollowUp,
  convertLead,
};
