const Admin = require("../models/Admin");

/**
 * Create or optionally reset the bootstrap admin from env vars.
 * Safe to run on every server start (idempotent unless ADMIN_SEED_RESET=true).
 */
async function ensureAdminSeed() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    const missing = [
      !email && "ADMIN_SEED_EMAIL",
      !password && "ADMIN_SEED_PASSWORD",
    ].filter(Boolean);
    console.warn(
      `[admin-seed] Skipped — set ${missing.join(" and ")} in Render Environment, then redeploy.`
    );
    return { skipped: true, missing };
  }

  const reset =
    process.env.ADMIN_SEED_RESET === "true" || process.argv.includes("--reset");
  const existing = await Admin.findOne({ email }).select("+password");

  if (existing) {
    if (reset) {
      existing.password = password;
      await existing.save();
      console.log("[admin-seed] Admin password synced");
      return { updated: true };
    }
    console.log("[admin-seed] Admin already exists");
    return { exists: true };
  }

  await Admin.create({
    name: process.env.ADMIN_SEED_NAME || "BluePeak Admin",
    email,
    password,
  });

  console.log("[admin-seed] Admin created");
  return { created: true };
}

module.exports = ensureAdminSeed;
