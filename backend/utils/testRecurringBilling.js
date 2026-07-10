/**
 * Recurring billing scenario verification.
 * Run: node utils/testRecurringBilling.js
 * Requires MONGO_URL in backend/.env
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Client = require("../models/Client");
const Service = require("../models/Service");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const RecurringDeliverableTemplate = require("../models/RecurringDeliverableTemplate");
const RecurringServiceWallet = require("../models/RecurringServiceWallet");
const { createRecurringService, updateRecurringConfig, upsertTemplateDeliverable } = require("../services/recurringService.service");
const {
  syncRecurringBillingForService,
  runDaily,
} = require("../services/recurringBillingJob.service");
const { createClientPaymentWithAllocations } = require("../services/clientPaymentAllocation.service");
const { addMonths, startOfMonth } = require("../utils/recurringDates");
const { getCurrentPeriodMonth, isHistoricalCycle } = require("../utils/recurringCycleScope");

const TEST_PREFIX = "recurring_billing_test_";
let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
};

const cleanup = async () => {
  const services = await Service.find({ notes: TEST_PREFIX }).select("_id clientId").lean();
  const serviceIds = services.map((s) => s._id);
  const clientIds = [...new Set(services.map((s) => s.clientId?.toString()).filter(Boolean))];

  if (serviceIds.length) {
    await BillingCycleDeliverable.deleteMany({ serviceId: { $in: serviceIds } });
    await RecurringDeliverableTemplate.deleteMany({ serviceId: { $in: serviceIds } });
    await BillingCycleInvoice.deleteMany({ serviceId: { $in: serviceIds } });
    await BillingCycle.deleteMany({ serviceId: { $in: serviceIds } });
    await RecurringServiceWallet.deleteMany({ serviceId: { $in: serviceIds } });
    await RecurringServiceConfig.deleteMany({ serviceId: { $in: serviceIds } });
    await Service.deleteMany({ _id: { $in: serviceIds } });
  }
  if (clientIds.length) {
    await Client.deleteMany({ _id: { $in: clientIds } });
  }
};

const createTestClient = async () =>
  Client.create({
    name: `${TEST_PREFIX}client`,
    companyName: "Test Co",
    email: `${TEST_PREFIX}@test.local`,
    notes: TEST_PREFIX,
  });

const createRecurring = async (client, startDate) => {
  const result = await createRecurringService(
    {
      service: {
        clientId: client._id,
        clientName: client.name,
        category: "SMM",
        name: `${TEST_PREFIX}service`,
        notes: TEST_PREFIX,
        billingModel: "recurring",
      },
      config: {
        startDate,
        billingDay: 9,
        monthlyClientAmount: 3000,
        monthlyFreelancerCost: 0,
        generationLeadDays: 5,
        status: "active",
      },
      templateDeliverables: [{ title: "Posts", description: "Monthly posts" }],
    },
    "test-admin"
  );
  await syncRecurringBillingForService(result.service._id);
  return result.service._id;
};

const countInvoices = async (serviceId) => BillingCycleInvoice.countDocuments({ serviceId });

const getInvoices = async (serviceId) =>
  BillingCycleInvoice.find({ serviceId }).sort({ dueDate: 1 }).lean();

const run = async () => {
  console.log("Recurring billing scenario tests\n");
  await connectDB();
  await cleanup();

  const client = await createTestClient();

  // Scenario 1: Create recurring service starting today
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const service1 = await createRecurring(client, todayStr);
  const count1 = await countInvoices(service1);
  assert(count1 >= 1, "Scenario 1: invoice generated for service starting today");

  // Scenario 2: Backfill 4 months ago
  const fourMonthsAgo = startOfMonth(addMonths(today, -4));
  const service2 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  const count2 = await countInvoices(service2);
  assert(count2 >= 5, `Scenario 2: backfilled invoices (got ${count2}, expected >= 5)`);

  // Scenario 3: Pay exact invoice amount
  const invoices3 = await getInvoices(service2);
  const firstDue = invoices3.find((i) => i.status !== "paid");
  if (firstDue) {
    await createClientPaymentWithAllocations(
      {
        clientId: client._id,
        serviceId: service2,
        totalAmount: 3000,
        paymentDate: todayStr,
        method: "UPI",
        notes: "exact pay",
      },
      "test-admin"
    );
    const paid = await BillingCycleInvoice.findById(firstDue._id).lean();
    assert(paid.status === "paid", "Scenario 3: exact payment marks invoice Paid");
  } else {
    assert(false, "Scenario 3: no due invoice found");
  }

  // Scenario 4: Partial payment on fresh service
  const service4 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  await createClientPaymentWithAllocations(
    {
      clientId: client._id,
      serviceId: service4,
      totalAmount: 2000,
      paymentDate: todayStr,
      method: "UPI",
    },
    "test-admin"
  );
  const partialInvoices = await getInvoices(service4);
  const partial = partialInvoices.find((i) => i.status === "partial");
  assert(!!partial, "Scenario 4: partial payment creates Partially Paid invoice");
  if (partial) {
    assert(partial.amountPaid === 2000, "Scenario 4: paid amount is 2000");
  }

  // Scenario 5: Overpay → prepaid credit (6 invoices × 3000 = 18000 outstanding)
  const service5 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  await createClientPaymentWithAllocations(
    {
      clientId: client._id,
      serviceId: service5,
      totalAmount: 20000,
      paymentDate: todayStr,
      method: "UPI",
    },
    "test-admin"
  );
  const wallet5 = await RecurringServiceWallet.findOne({ serviceId: service5 }).lean();
  assert((wallet5?.balance || 0) === 2000, `Scenario 5: overpay creates prepaid credit (got ${wallet5?.balance})`);

  // Scenario 6: Prepaid credit auto-pays invoices on self-heal
  const service6 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  await createClientPaymentWithAllocations(
    {
      clientId: client._id,
      serviceId: service6,
      totalAmount: 21000,
      paymentDate: todayStr,
      method: "UPI",
    },
    "test-admin"
  );
  const walletBefore = await RecurringServiceWallet.findOne({ serviceId: service6 }).lean();
  await BillingCycle.deleteMany({ serviceId: service6 });
  await BillingCycleInvoice.deleteMany({ serviceId: service6 });
  await syncRecurringBillingForService(service6);
  const walletAfter = await RecurringServiceWallet.findOne({ serviceId: service6 }).lean();
  const creditPaid = await BillingCycleInvoice.countDocuments({
    serviceId: service6,
    creditApplied: { $gt: 0 },
  });
  assert(
    creditPaid > 0 || (walletBefore?.balance || 0) > (walletAfter?.balance || 0),
    "Scenario 6: prepaid credit auto-applied to regenerated invoices"
  );

  // Scenario 7: Open service after gap — sync generates missing invoices
  const service7 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  await BillingCycle.deleteMany({ serviceId: service7 });
  await BillingCycleInvoice.deleteMany({ serviceId: service7 });
  const before7 = await countInvoices(service7);
  await syncRecurringBillingForService(service7);
  const after7 = await countInvoices(service7);
  assert(after7 > before7, "Scenario 7: self-heal backfills missing invoices on open");

  // Scenario 8: Refresh repeatedly — no duplicates
  const service8 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  const counts = [];
  for (let i = 0; i < 3; i += 1) {
    await syncRecurringBillingForService(service8);
    counts.push(await countInvoices(service8));
  }
  assert(
    counts[0] === counts[1] && counts[1] === counts[2],
    `Scenario 8: no duplicate invoices on refresh (${counts.join(", ")})`
  );

  // Scenario 9: Amount change with future_only leaves existing invoices unchanged
  const service9 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  const invoicesBefore9 = await getInvoices(service9);
  await updateRecurringConfig(service9, {
    monthlyClientAmount: 4000,
    applyScope: "future_only",
  });
  const invoicesAfter9 = await getInvoices(service9);
  const allStill3000 = invoicesAfter9.every((inv) => inv.amountDue === 3000);
  assert(allStill3000, "Scenario 9: future_only keeps all generated invoice amounts unchanged");

  // Scenario 10: Amount change with current_and_future updates current month only
  const service10 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  const currentPeriod = getCurrentPeriodMonth();
  await updateRecurringConfig(service10, {
    monthlyClientAmount: 4000,
    applyScope: "current_and_future",
  });
  const cycles10 = await BillingCycle.find({ serviceId: service10 }).lean();
  const invoices10 = await getInvoices(service10);
  const historicalInvoices10 = invoices10.filter((inv) => {
    const cycle = cycles10.find((c) => String(c._id) === String(inv.billingCycleId));
    return cycle && isHistoricalCycle(cycle, currentPeriod);
  });
  const currentInvoice10 = invoices10.find((inv) => {
    const cycle = cycles10.find((c) => String(c._id) === String(inv.billingCycleId));
    return cycle && !isHistoricalCycle(cycle, currentPeriod);
  });
  assert(
    historicalInvoices10.every((inv) => inv.amountDue === 3000),
    "Scenario 10: historical invoices remain at original amount"
  );
  assert(
    currentInvoice10?.amountDue === 4000,
    `Scenario 10: current month invoice updated to 4000 (got ${currentInvoice10?.amountDue})`
  );

  // Scenario 11: Template add with future_only does not alter existing cycle deliverables
  const service11 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  const cyclesBefore11 = await BillingCycle.find({ serviceId: service11 }).lean();
  const deliverableCountsBefore11 = await Promise.all(
    cyclesBefore11.map((cycle) =>
      BillingCycleDeliverable.countDocuments({ billingCycleId: cycle._id })
    )
  );
  await upsertTemplateDeliverable(service11, {
    title: "2 Stories",
    description: "Monthly stories",
    applyScope: "future_only",
  });
  const deliverableCountsAfter11 = await Promise.all(
    cyclesBefore11.map((cycle) =>
      BillingCycleDeliverable.countDocuments({ billingCycleId: cycle._id })
    )
  );
  assert(
    JSON.stringify(deliverableCountsBefore11) === JSON.stringify(deliverableCountsAfter11),
    "Scenario 11: future_only template add does not change existing cycle deliverables"
  );

  // Scenario 12: Template add with current_and_future updates current month deliverables
  const service12 = await createRecurring(client, fourMonthsAgo.toISOString().slice(0, 10));
  await upsertTemplateDeliverable(service12, {
    title: "2 Stories",
    description: "Monthly stories",
    applyScope: "current_and_future",
  });
  const currentCycle12 = await BillingCycle.findOne({
    serviceId: service12,
    periodMonth: currentPeriod,
  }).lean();
  const storiesInCurrent12 = currentCycle12
    ? await BillingCycleDeliverable.countDocuments({
        billingCycleId: currentCycle12._id,
        title: "2 Stories",
      })
    : 0;
  const historicalCycles12 = await BillingCycle.find({
    serviceId: service12,
    periodMonth: { $lt: currentPeriod },
  }).lean();
  let storiesInHistorical12 = 0;
  for (const cycle of historicalCycles12) {
    storiesInHistorical12 += await BillingCycleDeliverable.countDocuments({
      billingCycleId: cycle._id,
      title: "2 Stories",
    });
  }
  assert(storiesInCurrent12 === 1, "Scenario 12: current month includes new template deliverable");
  assert(storiesInHistorical12 === 0, "Scenario 12: historical months exclude new template deliverable");

  // Scenario 13: Config master amount updates while snapshots stay isolated
  const configAfter9 = await require("../models/RecurringServiceConfig").findOne({
    serviceId: service9,
  }).lean();
  assert(configAfter9.monthlyClientAmount === 4000, "Scenario 13: master recurring amount updates in config");

  await cleanup();

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

run().catch(async (err) => {
  console.error(err);
  try {
    await cleanup();
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
