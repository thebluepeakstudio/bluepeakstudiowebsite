const mongoose = require("mongoose");

const LEAD_STAGES = ["New", "Contacted", "Won", "Lost"];

const LEGACY_LEAD_STAGES = [
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "On Hold",
];

/** Stages allowed in status history (includes pre-migration values). */
const LEAD_STAGE_HISTORY = [...LEAD_STAGES, ...LEGACY_LEAD_STAGES];

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Outreach",
  "Ads",
  "Event",
  "Other",
];

const LEAD_PRIORITIES = ["Low", "Medium", "High"];

const LEAD_REQUIREMENTS = [
  "Website",
  "Marketing",
  "Designing",
  "Software",
  "SEO",
  "SMM",
  "Branding",
  "Video Editing",
];

const FOLLOW_UP_STATUSES = ["Scheduled", "Completed", "Missed", "Cancelled"];

const followUpHistorySchema = new mongoose.Schema(
  {
    scheduledAt: Date,
    completedAt: Date,
    status: { type: String, enum: FOLLOW_UP_STATUSES },
    notes: { type: String, trim: true },
  },
  { _id: true, timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    leadSource: { type: String, enum: LEAD_SOURCES, default: "Other" },
    status: { type: String, enum: LEAD_STAGES, default: "New" },
    priority: { type: String, enum: LEAD_PRIORITIES, default: "Medium" },
    estimatedProjectValue: { type: Number, default: 0, min: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    tags: [{ type: String, trim: true }],
    requirements: [{ type: String, enum: LEAD_REQUIREMENTS }],
    notes: { type: String, trim: true },
    lastContactDate: { type: Date },
    nextFollowUpDate: { type: Date },
    followUpStatus: { type: String, enum: FOLLOW_UP_STATUSES, default: "Scheduled" },
    reminderNotes: { type: String, trim: true },
    followUpHistory: [followUpHistorySchema],
    convertedClientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    convertedAt: { type: Date },
    isConverted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

leadSchema.index({ status: 1, nextFollowUpDate: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ leadSource: 1 });
leadSchema.index({ fullName: "text", companyName: "text", email: "text" });

module.exports = mongoose.model("Lead", leadSchema);
module.exports.LEAD_STAGES = LEAD_STAGES;
module.exports.LEGACY_LEAD_STAGES = LEGACY_LEAD_STAGES;
module.exports.LEAD_STAGE_HISTORY = LEAD_STAGE_HISTORY;
module.exports.LEAD_SOURCES = LEAD_SOURCES;
module.exports.LEAD_PRIORITIES = LEAD_PRIORITIES;
module.exports.LEAD_REQUIREMENTS = LEAD_REQUIREMENTS;
module.exports.FOLLOW_UP_STATUSES = FOLLOW_UP_STATUSES;
