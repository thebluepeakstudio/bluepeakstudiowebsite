const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const RecurringDeliverableTemplate = require("../models/RecurringDeliverableTemplate");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const BillingCycleFreelancerDue = require("../models/BillingCycleFreelancerDue");
const BillingJobRun = require("../models/BillingJobRun");
const { autoApplyWalletCredit, deriveInvoiceStatus } = require("./recurringWallet.service");
const {
  roundMoney,
  startOfMonth,
  startOfToday,
  buildBillingDate,
  buildGenerationDate,
  monthsFromStartToNow,
} = require("../utils/recurringDates");

const generateCycleForMonth = async (config, periodMonth, session = null) => {
  const serviceId = config.serviceId;
  const year = periodMonth.getFullYear();
  const month = periodMonth.getMonth();
  const billingDate = buildBillingDate(year, month, config.billingDay);
  const periodKey = startOfMonth(periodMonth);

  const existing = await BillingCycle.findOne({ serviceId, periodMonth: periodKey }).session(
    session || null
  );
  if (existing) return { created: false, cycle: existing };

  const clientAmount = roundMoney(config.monthlyClientAmount);
  const freelancerCost = roundMoney(config.monthlyFreelancerCost);

  const [cycle] = await BillingCycle.create(
    [
      {
        serviceId,
        periodMonth: periodKey,
        billingDate,
        clientAmountSnapshot: clientAmount,
        freelancerCostSnapshot: freelancerCost,
        phase: startOfToday() >= billingDate ? "due" : "upcoming",
        generatedAt: new Date(),
      },
    ],
    session ? { session } : undefined
  );

  const invoiceStatus =
    startOfToday() >= billingDate ? (clientAmount > 0 ? "due" : "paid") : "upcoming";

  await BillingCycleInvoice.create(
    [
      {
        billingCycleId: cycle._id,
        serviceId,
        amountDue: clientAmount,
        dueDate: billingDate,
        status: invoiceStatus,
      },
    ],
    session ? { session } : undefined
  );

  const templates = await RecurringDeliverableTemplate.find({
    serviceId,
    deletedAt: null,
  })
    .sort({ sortOrder: 1 })
    .session(session || null)
    .lean();

  if (templates.length) {
    await BillingCycleDeliverable.insertMany(
      templates.map((tpl, index) => ({
        billingCycleId: cycle._id,
        serviceId,
        templateDeliverableId: tpl._id,
        title: tpl.title,
        category: tpl.category,
        description: tpl.description || "",
        sortOrder: tpl.sortOrder ?? index,
        status: "Not Started",
        freelancerId: null,
        freelancerFee: 0,
      })),
      session ? { session } : undefined
    );
  }

  if (startOfToday() >= billingDate) {
    const creditResult = await autoApplyWalletCredit(serviceId, session);
    const invoice = await BillingCycleInvoice.findOne({ billingCycleId: cycle._id }).session(
      session || null
    );
    if (invoice && creditResult.applied > 0) {
      invoice.status = deriveInvoiceStatus(invoice);
      if (invoice.status === "paid" && !invoice.paidAt) invoice.paidAt = new Date();
      await invoice.save(session ? { session } : undefined);
    }
  }

  return { created: true, cycle };
};

const flipCycleToDue = async (cycle, session = null) => {
  if (cycle.phase === "due" || cycle.phase === "closed") return false;

  cycle.phase = "due";
  await cycle.save(session ? { session } : undefined);

  const invoice = await BillingCycleInvoice.findOne({ billingCycleId: cycle._id }).session(
    session || null
  );
  if (invoice && invoice.status === "upcoming") {
    invoice.status = deriveInvoiceStatus({ ...invoice.toObject(), status: "due" });
    if (invoice.status === "due" && invoice.amountDue <= 0) {
      invoice.status = "paid";
      invoice.paidAt = new Date();
    }
    await invoice.save(session ? { session } : undefined);
  }

  const due = await BillingCycleFreelancerDue.findOne({ billingCycleId: cycle._id }).session(
    session || null
  );
  if (due && due.status === "upcoming") {
    due.status = due.amountDue > 0 ? "due" : "paid";
    await due.save(session ? { session } : undefined);
  }

  return true;
};

const syncRecurringBillingForConfig = async (config) => {
  const today = startOfToday();
  let cyclesGenerated = 0;
  let cyclesDueFlipped = 0;
  let creditsApplied = 0;

  const months = monthsFromStartToNow(config.startDate);

  for (const periodMonth of months) {
    const year = periodMonth.getFullYear();
    const month = periodMonth.getMonth();
    const generationDate = buildGenerationDate(
      year,
      month,
      config.billingDay,
      config.generationLeadDays
    );

    if (today >= generationDate) {
      const result = await generateCycleForMonth(config, periodMonth);
      if (result.created) cyclesGenerated += 1;
    }
  }

  const upcomingCycles = await BillingCycle.find({
    serviceId: config.serviceId,
    phase: "upcoming",
    billingDate: { $lte: today },
  });

  for (const cycle of upcomingCycles) {
    const flipped = await flipCycleToDue(cycle);
    if (flipped) {
      cyclesDueFlipped += 1;
      const creditResult = await autoApplyWalletCredit(config.serviceId);
      creditsApplied = roundMoney(creditsApplied + creditResult.applied);

      const invoice = await BillingCycleInvoice.findOne({ billingCycleId: cycle._id });
      if (invoice) {
        invoice.status = deriveInvoiceStatus(invoice);
        if (invoice.status === "paid" && !invoice.paidAt) invoice.paidAt = new Date();
        await invoice.save();
      }
    }
  }

  const dueCyclesNeedingCredit = await BillingCycle.find({
    serviceId: config.serviceId,
    phase: "due",
    billingDate: { $lte: today },
  });

  for (const cycle of dueCyclesNeedingCredit) {
    const invoice = await BillingCycleInvoice.findOne({
      billingCycleId: cycle._id,
      status: { $in: ["due", "partial", "overdue"] },
    });
    if (!invoice) continue;
    const open = roundMoney(invoice.amountDue - invoice.creditApplied - invoice.amountPaid);
    if (open <= 0) continue;
    const creditResult = await autoApplyWalletCredit(config.serviceId);
    creditsApplied = roundMoney(creditsApplied + creditResult.applied);
    const refreshed = await BillingCycleInvoice.findById(invoice._id);
    refreshed.status = deriveInvoiceStatus(refreshed);
    if (refreshed.status === "paid" && !refreshed.paidAt) refreshed.paidAt = new Date();
    await refreshed.save();
  }

  return { cyclesGenerated, cyclesDueFlipped, creditsApplied };
};

const syncRecurringBillingForService = async (serviceId) => {
  const config = await RecurringServiceConfig.findOne({ serviceId, status: "active" }).lean();
  if (!config) return { cyclesGenerated: 0, cyclesDueFlipped: 0, creditsApplied: 0 };
  return syncRecurringBillingForConfig(config);
};

const runDaily = async () => {
  const run = await BillingJobRun.create({ status: "running", startedAt: new Date() });
  let cyclesGenerated = 0;
  let cyclesDueFlipped = 0;
  let creditsApplied = 0;

  try {
    const configs = await RecurringServiceConfig.find({ status: "active" }).lean();

    for (const config of configs) {
      const result = await syncRecurringBillingForConfig(config);
      cyclesGenerated += result.cyclesGenerated;
      cyclesDueFlipped += result.cyclesDueFlipped;
      creditsApplied = roundMoney(creditsApplied + result.creditsApplied);
    }

    run.status = "success";
    run.finishedAt = new Date();
    run.cyclesGenerated = cyclesGenerated;
    run.cyclesDueFlipped = cyclesDueFlipped;
    run.creditsApplied = creditsApplied;
    await run.save();

    return {
      cyclesGenerated,
      cyclesDueFlipped,
      creditsApplied,
    };
  } catch (err) {
    run.status = "failed";
    run.finishedAt = new Date();
    run.errorMessage = err.message;
    await run.save();
    throw err;
  }
};

module.exports = {
  generateCycleForMonth,
  flipCycleToDue,
  syncRecurringBillingForService,
  syncRecurringBillingForConfig,
  runDaily,
};
