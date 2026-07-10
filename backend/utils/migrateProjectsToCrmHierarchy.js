require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Client = require("../models/Client");
const Brand = require("../models/Brand");
const MigrationLog = require("../models/MigrationLog");

const MIGRATION_ID = "crm_hierarchy_v1";

const COLLECTION_RENAMES = [
  ["projects", "services"],
  ["projectdeliverables", "deliverables"],
  ["projectpayments", "servicepayments"],
  ["recurringprojectconfigs", "recurringserviceconfigs"],
  ["recurringprojectwallets", "recurringservicewallets"],
];

const PROJECT_ID_RENAMES = [
  "projectdeliverables",
  "projectpayments",
  "recurringserviceconfigs",
  "recurringdeliverabletemplates",
  "recurringservicewallets",
  "billingcycles",
  "billingcycleinvoices",
  "billingcycledeliverables",
  "billingcyclefreelancerdues",
  "wallettransactions",
  "expenses",
  "documents",
  "freelancerpayments",
];

const renameCollection = async (db, from, to) => {
  const exists = await db.listCollections({ name: from }).toArray();
  if (!exists.length) return false;
  const targetExists = await db.listCollections({ name: to }).toArray();
  if (targetExists.length) {
    console.log(`  skip rename ${from} → ${to} (target exists)`);
    return false;
  }
  await db.collection(from).rename(to);
  console.log(`  renamed ${from} → ${to}`);
  return true;
};

const transformProjectToService = async (db) => {
  const collName = (await db.listCollections({ name: "services" }).toArray()).length
    ? "services"
    : "projects";
  const coll = db.collection(collName);

  const cursor = coll.find({});
  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const updates = {
      legacyProjectId: doc.legacyProjectId || doc._id,
    };
    if (doc.projectTitle != null && doc.name == null) updates.name = doc.projectTitle;
    if (doc.projectType != null && doc.category == null) updates.category = doc.projectType;
    if (doc.projectDescription != null && doc.description == null) {
      updates.description = doc.projectDescription;
    }
    if (doc.totalAmount != null && doc.totalPrice == null) updates.totalPrice = doc.totalAmount;

    const unset = {};
    if (doc.projectTitle != null) unset.projectTitle = "";
    if (doc.projectType != null) unset.projectType = "";
    if (doc.projectDescription != null) unset.projectDescription = "";
    if (doc.totalAmount != null) unset.totalAmount = "";

    await coll.updateOne(
      { _id: doc._id },
      {
        $set: updates,
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      }
    );
    count += 1;
  }
  console.log(`  transformed ${count} service documents in ${collName}`);
};

const transformDeliverables = async (db) => {
  const names = ["deliverables", "projectdeliverables"];
  for (const name of names) {
    const exists = await db.listCollections({ name }).toArray();
    if (!exists.length) continue;
    const coll = db.collection(name);
    const withProjectId = await coll.countDocuments({ projectId: { $exists: true } });
    if (withProjectId) {
      await coll.updateMany(
        { projectId: { $exists: true } },
        { $rename: { projectId: "serviceId" } }
      );
    }
    const withExpected = await coll.countDocuments({ expectedCompletion: { $exists: true } });
    if (withExpected) {
      const docs = await coll.find({ expectedCompletion: { $exists: true } }).toArray();
      for (const d of docs) {
        await coll.updateOne(
          { _id: d._id },
          {
            $set: { dueDate: d.expectedCompletion },
            $unset: { expectedCompletion: "" },
          }
        );
      }
    }
    console.log(`  updated deliverables in ${name}`);
    break;
  }
};

const renameProjectIdFields = async (db) => {
  for (const name of PROJECT_ID_RENAMES) {
    const exists = await db.listCollections({ name }).toArray();
    if (!exists.length) continue;
    const coll = db.collection(name);
    const count = await coll.countDocuments({ projectId: { $exists: true } });
    if (count) {
      await coll.updateMany({ projectId: { $exists: true } }, { $rename: { projectId: "serviceId" } });
      console.log(`  renamed projectId→serviceId in ${name} (${count} docs)`);
    }
  }
};

const assignBrands = async () => {
  const clients = await Client.find({}).lean();
  let brandsCreated = 0;
  let servicesLinked = 0;

  const db = mongoose.connection.db;
  const serviceColl = db.collection("services");

  for (const client of clients) {
    let brand = await Brand.findOne({ clientId: client._id, isDefault: true });
    if (!brand) {
      brand = await Brand.create({
        clientId: client._id,
        name: "Primary Business",
        isDefault: true,
        status: "Active",
      });
      brandsCreated += 1;
    }

    const result = await serviceColl.updateMany(
      { clientId: client._id, brandId: { $exists: false } },
      { $set: { brandId: brand._id } }
    );
    servicesLinked += result.modifiedCount;
  }

  return { brandsCreated, servicesLinked, clientCount: clients.length };
};

const updateAllocationTargets = async (db) => {
  const exists = await db.listCollections({ name: "paymentallocations" }).toArray();
  if (!exists.length) return;
  const r = await db
    .collection("paymentallocations")
    .updateMany({ targetType: "one_time_project" }, { $set: { targetType: "one_time_service" } });
  console.log(`  updated ${r.modifiedCount} payment allocation target types`);
};

const verify = async (db) => {
  const serviceCount = await db.collection("services").countDocuments();
  const brandCount = await db.collection("brands").countDocuments();
  const unbranded = await db.collection("services").countDocuments({ brandId: { $exists: false } });
  const deliverableCount = await db.collection("deliverables").countDocuments();
  return { serviceCount, brandCount, unbranded, deliverableCount };
};

const run = async () => {
  await connectDB();
  const existing = await MigrationLog.findOne({ id: MIGRATION_ID });
  if (existing) {
    console.log("Migration already applied:", MIGRATION_ID);
    console.log(existing.result);
    process.exit(0);
  }

  const db = mongoose.connection.db;
  console.log("Step 1: Transform project documents to service shape...");
  await transformProjectToService(db);

  console.log("Step 2: Create brands and link services...");
  const brandStats = await assignBrands();

  console.log("Step 3: Rename projectId → serviceId in child collections...");
  await renameProjectIdFields(db);
  await transformDeliverables(db);

  console.log("Step 4: Rename collections...");
  for (const [from, to] of COLLECTION_RENAMES) {
    await renameCollection(db, from, to);
  }

  console.log("Step 5: Update payment allocation enums...");
  await updateAllocationTargets(db);

  console.log("Step 6: Verification...");
  const verification = await verify(db);

  const result = {
    ...brandStats,
    verification,
    completedAt: new Date().toISOString(),
  };

  await MigrationLog.create({ id: MIGRATION_ID, result });
  console.log("\nMigration complete:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
