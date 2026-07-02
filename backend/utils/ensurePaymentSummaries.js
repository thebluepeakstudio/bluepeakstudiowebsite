const MigrationLog = require("../models/MigrationLog");
const { recomputeAllProjectPayments } = require("./recomputeAllProjectPayments");

const MIGRATION_ID = "recompute-project-payment-summaries-v1";

/**
 * Runs once per database on deploy: syncs remainingAmount / paymentStatus from the
 * payment ledger so dashboard "Outstanding" and project payment badges are correct.
 */
async function ensurePaymentSummariesRecalculated() {
  const force =
    process.env.PAYMENT_SUMMARY_RECOMPUTE === "true" ||
    process.argv.includes("--recompute-payments");

  if (!force) {
    const applied = await MigrationLog.findOne({ id: MIGRATION_ID }).lean();
    if (applied) {
      console.log("[payment-recompute] Already applied on", applied.appliedAt?.toISOString?.() || applied.appliedAt);
      return { skipped: true, appliedAt: applied.appliedAt };
    }
  }

  console.log("[payment-recompute] Reconciling project payment summaries…");
  const result = await recomputeAllProjectPayments();
  console.log(
    `[payment-recompute] Done — ${result.updated}/${result.total} projects updated` +
      (result.paymentsMigrated ? `, ${result.paymentsMigrated} legacy payments migrated` : "") +
      (result.errors ? `, ${result.errors} errors` : "")
  );

  if (!force) {
    await MigrationLog.findOneAndUpdate(
      { id: MIGRATION_ID },
      { id: MIGRATION_ID, appliedAt: new Date(), result },
      { upsert: true, new: true }
    );
  }

  return { applied: true, ...result };
}

module.exports = ensurePaymentSummariesRecalculated;
