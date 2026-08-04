const Service = require("../models/Service");
const { syncRecurringServiceFinancials } = require("./financialMetrics");

/** Recompute remainingAmount / paymentStatus for all recurring services from cycle invoices. */
const ensureRecurringFinancialsSynced = async () => {
  const ids = await Service.find({ billingModel: "recurring" }).distinct("_id");
  let updated = 0;
  for (const id of ids) {
    await syncRecurringServiceFinancials(id);
    updated += 1;
  }
  if (updated) {
    console.log(`[recurring-financials] Synced ${updated} recurring service(s)`);
  }
};

module.exports = ensureRecurringFinancialsSynced;
