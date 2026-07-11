require("dotenv").config();
const connectDB = require("../config/db");
const ensureAdminSeed = require("./ensureAdminSeed");

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error("MONGO_URL is required");
    process.exit(1);
  }
  if (!process.env.ADMIN_SEED_EMAIL || !process.env.ADMIN_SEED_PASSWORD) {
    console.error("ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required");
    process.exit(1);
  }

  await connectDB();
  const result = await ensureAdminSeed();

  if (result.skipped) {
    console.error("Seed skipped — check ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD");
    process.exit(1);
  }
  if (result.exists) {
    console.log("Admin already exists — set ADMIN_SEED_RESET=true or run: npm run seed:admin -- --reset");
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
