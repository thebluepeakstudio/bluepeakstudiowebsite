const CRITICAL = ["MONGO_URL", "JWT_SECRET"];

const PROD_REQUIRED = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "BILLING_JOB_SECRET",
];

function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const required = [...CRITICAL, ...(isProd ? PROD_REQUIRED : [])];
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("[FATAL] Set them in your host environment, then redeploy.");
    process.exit(1);
  }

  if (isProd && !process.env.NODE_ENV) {
    console.warn("[env] NODE_ENV is not set to production — auth cookies and TLS checks may be misconfigured.");
  }

  if (!isProd) {
    const missingRecommended = PROD_REQUIRED.filter((key) => !process.env[key]?.trim());
    if (missingRecommended.length > 0) {
      console.warn(
        `[env] Missing recommended variables (required in production): ${missingRecommended.join(", ")}`
      );
    }
  }
}

module.exports = validateEnv;
