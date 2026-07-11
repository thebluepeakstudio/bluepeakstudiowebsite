/**
 * Backfill FreelancerDue records from existing assignments and legacy cycle dues.
 * Run: npm run migrate:freelancer-dues
 */
require("dotenv").config();
const mongoose = require("mongoose");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const Deliverable = require("../models/Deliverable");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const BillingCycleFreelancerDue = require("../models/BillingCycleFreelancerDue");
const BillingCycle = require("../models/BillingCycle");
const FreelancerDue = require("../models/FreelancerDue");
const {
  syncDueForAssignment,
  syncDueForCycleDeliverable,
  upsertFreelancerDue,
  resolveServiceContext,
} = require("../services/freelancerDue.service");
const { DELIVERABLE_DUE_TRIGGER_STATUSES } = require("../constants/serviceCategories");
const { roundMoney } = require("./recurringDates");

const run = async () => {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    throw new Error("MONGO_URL is not set in .env");
  }
  await mongoose.connect(uri);
  console.log("Connected. Migrating freelancer dues...");

  let assignmentCount = 0;
  let cycleDeliverableCount = 0;
  let legacyCycleCount = 0;

  const assignments = await DeliverableAssignment.find({ deletedAt: null }).lean();
  for (const assignment of assignments) {
    const deliverable = await Deliverable.findById(assignment.deliverableId).lean();
    if (!deliverable || deliverable.deletedAt) continue;
    if (!DELIVERABLE_DUE_TRIGGER_STATUSES.includes(deliverable.status)) continue;
    if (!assignment.freelancerId || roundMoney(assignment.cost) <= 0) continue;

    const existing = await FreelancerDue.findOne({
      deliverableAssignmentId: assignment._id,
    });
    if (existing) continue;

    await syncDueForAssignment(assignment);
    assignmentCount += 1;
  }

  const cycleDeliverables = await BillingCycleDeliverable.find({
    freelancerId: { $ne: null },
  }).lean();

  for (const row of cycleDeliverables) {
    const fee = roundMoney(row.freelancerFee);
    if (fee <= 0) continue;
    if (!DELIVERABLE_DUE_TRIGGER_STATUSES.includes(row.status)) continue;

    const existing = await FreelancerDue.findOne({
      billingCycleDeliverableId: row._id,
      freelancerId: row.freelancerId,
    });
    if (existing) continue;

    await syncDueForCycleDeliverable(row);
    cycleDeliverableCount += 1;
  }

  const legacyDues = await BillingCycleFreelancerDue.find({
    amountDue: { $gt: 0 },
  }).lean();

  for (const legacy of legacyDues) {
    if (!legacy.freelancerId) continue;
    const existing = await FreelancerDue.findOne({
      legacyBillingCycleFreelancerDueId: legacy._id,
    });
    if (existing) continue;

    const cycle = await BillingCycle.findById(legacy.billingCycleId).lean();
    const ctx = await resolveServiceContext(legacy.serviceId);
    const status =
      legacy.status === "paid"
        ? "paid"
        : legacy.amountPaid > 0
          ? "partial"
          : "pending";

    await upsertFreelancerDue({
      freelancerId: legacy.freelancerId,
      clientId: ctx.clientId,
      brandId: ctx.brandId,
      serviceId: legacy.serviceId,
      billingCycleId: legacy.billingCycleId,
      billingMonth: cycle?.periodMonth || null,
      legacyBillingCycleFreelancerDueId: legacy._id,
      deliverableTitle: "Monthly freelancer cost (legacy)",
      serviceTitle: ctx.serviceTitle,
      clientName: ctx.clientName,
      brandName: ctx.brandName,
      amount: roundMoney(legacy.amountDue),
      amountPaid: roundMoney(legacy.amountPaid),
      status,
      paidAt: legacy.paidAt || null,
    });
    legacyCycleCount += 1;
  }

  const totalDues = await FreelancerDue.countDocuments();
  console.log(`Assignments migrated: ${assignmentCount}`);
  console.log(`Cycle deliverables migrated: ${cycleDeliverableCount}`);
  console.log(`Legacy cycle dues migrated: ${legacyCycleCount}`);
  console.log(`Total FreelancerDue records: ${totalDues}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
