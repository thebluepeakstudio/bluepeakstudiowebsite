require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Project = require("../models/Project");
const Client = require("../models/Client");

const normalizeKey = (p) =>
  [
    (p.clientName || "").trim().toLowerCase(),
    (p.businessName || "").trim().toLowerCase(),
    (p.email || "").trim().toLowerCase(),
  ].join("|");

const migrate = async () => {
  await connectDB();
  const projects = await Project.find({
    $or: [{ clientId: { $exists: false } }, { clientId: null }],
  });
  const groups = new Map();

  for (const p of projects) {
    const key = normalizeKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  let clientsCreated = 0;
  let projectsUpdated = 0;

  for (const [, group] of groups) {
    const sample = group[0];
    let client = await Client.findOne({
      name: sample.clientName,
      companyName: sample.businessName || "",
      email: sample.email || "",
    });

    if (!client) {
      client = await Client.create({
        name: sample.clientName,
        companyName: sample.businessName || "",
        email: sample.email || "",
        phone: sample.contactNumber || "",
        status: "Active",
      });
      clientsCreated += 1;
    }

    for (const project of group) {
      if (!project.clientId) {
        project.clientId = client._id;
        await project.save();
        projectsUpdated += 1;
      }
    }
  }

  console.log(`Clients created: ${clientsCreated}`);
  console.log(`Projects updated: ${projectsUpdated}`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
