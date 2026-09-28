require("dotenv").config();
const connectDB = require("../config/db");
const ensureAdminSeed = require("./ensureAdminSeed");

const run = async () => {
  const confirmed =
    process.argv.includes("--confirm") || process.env.DB_RESET_CONFIRM === "true";

  if (!confirmed) {
    console.error(
      "Refusing to wipe the database without confirmation.\n" +
        "Run: npm run db:reset -- --confirm\n" +
        "Or set DB_RESET_CONFIRM=true in .env for one run."
    );
    process.exit(1);
  }

  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL is required");
    process.exit(1);
  }

  await connectDB();

  const dbName = require("mongoose").connection.db.databaseName;
  console.log(`Dropping database: ${dbName}`);
  await require("mongoose").connection.dropDatabase();
  console.log("Database dropped.");

  const seed = await ensureAdminSeed();
  if (seed.skipped) {
    console.error("Admin seed skipped — set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env");
    process.exit(1);
  }
  if (seed.created) console.log("Admin user created from ADMIN_SEED_* env vars.");
  if (seed.updated) console.log("Admin password synced from ADMIN_SEED_* env vars.");
  if (seed.exists) console.log("Admin user ready (already existed after drop — unexpected).");

  await require("mongoose").disconnect();
  console.log("Done. You can sign in at /admin-panel/login with your seeded admin.");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
