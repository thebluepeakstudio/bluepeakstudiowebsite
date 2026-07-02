const mongoose = require("mongoose");

const migrationLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    appliedAt: { type: Date, default: Date.now },
    result: { type: mongoose.Schema.Types.Mixed },
  },
  { versionKey: false }
);

module.exports = mongoose.model("MigrationLog", migrationLogSchema);
