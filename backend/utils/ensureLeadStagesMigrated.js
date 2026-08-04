const Lead = require("../models/Lead");

const LEGACY_TO_CONTACTED = ["Qualified", "Proposal Sent", "Negotiation", "On Hold"];

/** Map retired lead stages onto Contacted (idempotent). */
const ensureLeadStagesMigrated = async () => {
  const result = await Lead.updateMany(
    { status: { $in: LEGACY_TO_CONTACTED } },
    { $set: { status: "Contacted" } }
  );
  const count = result.modifiedCount || 0;
  if (count) {
    console.log(`[lead-stages] Migrated ${count} lead(s) to Contacted`);
  }
};

module.exports = ensureLeadStagesMigrated;
