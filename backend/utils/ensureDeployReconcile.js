const ensureDeprecatedFieldsDropped = require("./ensureDeprecatedFieldsDropped");
const ensureLeadStagesMigrated = require("./ensureLeadStagesMigrated");
const { reconcileAllCrmData } = require("./reconcileAllCrmData");
const { runDaily } = require("../services/recurringBillingJob.service");

const shouldRunDeployReconcile = () => {
  if (process.env.DEPLOY_RECONCILE === "false") return false;
  if (process.env.DEPLOY_RECONCILE === "true") return true;
  return process.env.NODE_ENV === "production";
};

/**
 * Runs on each production deploy / server start (unless DEPLOY_RECONCILE=false).
 * Re-syncs payment summaries, deliverable totals, recurring invoices, freelancer counts, and dues.
 */
async function ensureDeployReconcile() {
  if (!shouldRunDeployReconcile()) {
    console.log("[deploy-reconcile] Skipped (set DEPLOY_RECONCILE=true to run in development)");
    return { skipped: true };
  }

  const started = Date.now();
  console.log("[deploy-reconcile] Starting post-deploy data reconciliation…");

  await ensureDeprecatedFieldsDropped();
  await ensureLeadStagesMigrated();

  try {
    const billing = await runDaily();
    if (
      billing.cyclesGenerated ||
      billing.cyclesDueFlipped ||
      billing.creditsApplied
    ) {
      console.log(
        `[deploy-reconcile] Recurring billing — generated: ${billing.cyclesGenerated}, due: ${billing.cyclesDueFlipped}, wallet applied: ${billing.creditsApplied}`
      );
    }
  } catch (err) {
    console.error("[deploy-reconcile] Recurring billing sync failed:", err.message);
  }

  const result = await reconcileAllCrmData();

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[deploy-reconcile] Done in ${elapsed}s — ` +
      `services: ${result.services.updated}/${result.services.total}, ` +
      `legacy projects: ${result.legacyProjects.updated}/${result.legacyProjects.total}, ` +
      `freelancers: ${result.freelancers.freelancers}, ` +
      `assignment dues: ${result.dues.synced}/${result.dues.assignments}`
  );

  return { applied: true, ...result, elapsedSeconds: Number(elapsed) };
}

module.exports = ensureDeployReconcile;
module.exports.shouldRunDeployReconcile = shouldRunDeployReconcile;
