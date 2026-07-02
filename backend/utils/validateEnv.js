const REQUIRED = ["MONGO_URL", "JWT_SECRET"];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) return;

  console.error(`[env] Missing required variables: ${missing.join(", ")}`);
  console.error("[env] Add them in Render → Environment, then redeploy.");
}

module.exports = validateEnv;
