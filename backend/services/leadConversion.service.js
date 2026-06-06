const Lead = require("../models/Lead");
const LeadActivity = require("../models/LeadActivity");
const LeadAttachment = require("../models/LeadAttachment");
const LeadStatusHistory = require("../models/LeadStatusHistory");
const Client = require("../models/Client");
const ClientActivity = require("../models/ClientActivity");
const ClientAttachment = require("../models/ClientAttachment");
const ApiError = require("../utils/ApiError");

const convertLeadToClient = async (leadId, admin) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new ApiError(404, "Lead not found");
  if (lead.isConverted) throw new ApiError(400, "Lead already converted");
  if (lead.status !== "Won") {
    throw new ApiError(400, "Only won leads can be converted to clients");
  }

  const existingClient = await Client.findOne({ sourceLeadId: lead._id });
  if (existingClient) {
    throw new ApiError(400, "Client already exists for this lead");
  }

  const [activities, attachments] = await Promise.all([
    LeadActivity.find({ leadId: lead._id }).sort({ occurredAt: 1 }),
    LeadAttachment.find({ leadId: lead._id }),
  ]);

  const noteBodies = activities
    .filter((a) => a.type === "note" && a.body)
    .map((a) => a.body);
  const mergedNotes = [lead.notes, ...noteBodies].filter(Boolean).join("\n\n");

  const client = await Client.create({
    name: lead.fullName,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    notes: mergedNotes,
    tags: lead.tags || [],
    sourceLeadId: lead._id,
    status: "Active",
  });

  if (activities.length) {
    await ClientActivity.insertMany(
      activities.map((a) => ({
        clientId: client._id,
        type: a.type,
        title: a.title,
        body: a.body,
        occurredAt: a.occurredAt,
        dueDate: a.dueDate,
        createdBy: a.createdBy,
        createdById: a.createdById,
        sourceLeadActivityId: a._id,
      }))
    );
  }

  if (attachments.length) {
    await ClientAttachment.insertMany(
      attachments.map((a) => ({
        clientId: client._id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        publicId: a.publicId,
        uploadedBy: a.uploadedBy,
        sourceLeadAttachmentId: a._id,
      }))
    );
  }

  await LeadStatusHistory.create({
    leadId: lead._id,
    fromStatus: lead.status,
    toStatus: "Won",
    changedBy: admin.name,
    changedById: admin._id,
    note: "Converted to client",
  });

  lead.isConverted = true;
  lead.convertedClientId = client._id;
  lead.convertedAt = new Date();
  await lead.save();

  const updatedLead = await Lead.findById(lead._id)
    .populate("assignedTo", "name email")
    .populate("convertedClientId", "name companyName");

  return { lead: updatedLead, client };
};

module.exports = { convertLeadToClient };
