/**
 * Drop legacy projectId indexes from billing collections after CRM migration to services.
 * Run once: node utils/fixRecurringIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const RecurringServiceWallet = require("../models/RecurringServiceWallet");

const LEGACY_INDEX_PATTERNS = ["projectId_1", "projectId_1_periodMonth_1"];

const dropLegacyIndexes = async (collectionName) => {
  const coll = mongoose.connection.collection(collectionName);
  const exists = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
  if (!exists.length) return;

  const indexes = await coll.indexes();
  for (const idx of indexes) {
    if (LEGACY_INDEX_PATTERNS.includes(idx.name) || idx.key?.projectId) {
      try {
        await coll.dropIndex(idx.name);
        console.log(`  dropped ${collectionName}.${idx.name}`);
      } catch (err) {
        if (err.code !== 27) console.warn(`  skip ${collectionName}.${idx.name}:`, err.message);
      }
    }
  }
};

const run = async () => {
  await connectDB();
  const collections = [
    "billingcycles",
    "billingcycleinvoices",
    "recurringserviceconfigs",
    "recurringservicewallets",
    "recurringdeliverabletemplates",
    "wallettransactions",
  ];

  for (const name of collections) {
    await dropLegacyIndexes(name);
  }

  await BillingCycle.syncIndexes();
  await BillingCycleInvoice.syncIndexes();
  await RecurringServiceConfig.syncIndexes();
  await RecurringServiceWallet.syncIndexes();

  console.log("Recurring index fix complete.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
