require("dotenv").config();
const connectDB = require("./config/db");
const Project = require("./models/Project");

const run = async () => {
  await connectDB();
  const result = await Project.updateMany(
    { $or: [{ billingModel: { $exists: false } }, { billingModel: null }] },
    { $set: { billingModel: "one_time" } }
  );
  console.log(`Migration complete. Projects updated: ${result.modifiedCount}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
