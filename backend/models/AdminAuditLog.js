const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String, trim: true, default: "" },
    success: { type: Boolean, default: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    adminEmail: { type: String, trim: true, lowercase: true, default: "" },
    ip: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
    correlationId: { type: String, trim: true, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
