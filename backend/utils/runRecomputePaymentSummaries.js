require("dotenv").config();
const connectDB = require("../config/db");
const MigrationLog = require("../models/MigrationLog");
const { recomputeAllProjectPayments } = require("./recomputeAllProjectPayments");

const MIGRATION_ID = "recompute-project-payment-summaries-v1";

const run = async () => {
  await connectDB();
  console.log("[payment-recompute] Reconciling project payment summaries (manual run)…");
  const result = await recomputeAllProjectPayments();
  await MigrationLog.findOneAndUpdate(
    { id: MIGRATION_ID },
    { id: MIGRATION_ID, appliedAt: new Date(), result },
    { upsert: true, new: true }
  );
  console.log(result);
  process.exit(result.errors > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
