require("dotenv").config();
const connectDB = require("../config/db");
const ensureDeployReconcile = require("./ensureDeployReconcile");

const run = async () => {
  process.env.DEPLOY_RECONCILE = process.env.DEPLOY_RECONCILE || "true";
  await connectDB();
  await ensureDeployReconcile();
  await require("mongoose").disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
