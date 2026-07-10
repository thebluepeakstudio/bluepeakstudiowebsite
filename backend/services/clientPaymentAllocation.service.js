const mongoose = require("mongoose");
const ClientPayment = require("../models/ClientPayment");
const PaymentAllocation = require("../models/PaymentAllocation");
const Service = require("../models/Service");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycle = require("../models/BillingCycle");
const RecurringServiceWallet = require("../models/RecurringServiceWallet");
const ApiError = require("../utils/ApiError");
const { roundMoney, formatPeriodLabel } = require("../utils/recurringDates");
const { addCredit, deriveInvoiceStatus } = require("./recurringWallet.service");
const { createPayment } = require("./servicePayment.service");

const OPEN_INVOICE_STATUSES = ["due", "partial", "overdue", "upcoming"];
const ALLOCATABLE_INVOICE_STATUSES = ["due", "partial", "overdue"];

const allocationTypeLabel = (targetType) => {
  if (targetType === "one_time_service") return "One-time service";
  if (targetType === "cycle_invoice") return "Recurring invoice";
  if (targetType === "recurring_wallet") return "Prepaid credit";
  return targetType;
};

const getInvoiceOpenAmount = (invoice) =>
  Math.max(0, roundMoney(invoice.amountDue - invoice.creditApplied - invoice.amountPaid));

const loadOpenInvoicesForService = async (serviceId, session = null) => {
  const query = BillingCycleInvoice.find({
    serviceId,
    status: { $in: OPEN_INVOICE_STATUSES },
  }).sort({ dueDate: 1 });
  if (session) query.session(session);
  const invoices = await query.lean();

  const cycleIds = invoices.map((inv) => inv.billingCycleId);
  const cycleQuery = BillingCycle.find({ _id: { $in: cycleIds } }).lean();
  if (session) cycleQuery.session(session);
  const cycles = await cycleQuery;
  const cycleMap = Object.fromEntries(cycles.map((c) => [c._id.toString(), c]));

  return invoices
    .map((inv) => {
      const cycle = cycleMap[inv.billingCycleId?.toString()];
      const openAmount = getInvoiceOpenAmount(inv);
      return {
        ...inv,
        openAmount,
        periodLabel: cycle ? formatPeriodLabel(new Date(cycle.periodMonth)) : "Invoice",
        billingCycleId: inv.billingCycleId,
        isAllocatable: ALLOCATABLE_INVOICE_STATUSES.includes(inv.status),
      };
    })
    .filter((inv) => inv.openAmount > 0);
};

const buildAllocationPlan = async (serviceId, amount, session = null) => {
  const serviceQuery = Service.findById(serviceId);
  if (session) serviceQuery.session(session);
  const service = await serviceQuery.lean();
  if (!service) throw new ApiError(404, "Service not found");

  const paymentAmount = roundMoney(amount);
  if (paymentAmount <= 0) throw new ApiError(400, "Payment amount must be greater than 0");

  const serviceName = service.name || service.projectTitle || service.category || "Service";

  if (service.billingModel !== "recurring") {
    const outstanding = roundMoney(
      Math.max(
        0,
        Number(service.remainingAmount) ||
          Math.max(0, roundMoney(service.totalPrice) - roundMoney(service.advanceReceived))
      )
    );

    return {
      billingModel: "one_time",
      serviceId: service._id,
      serviceName,
      outstanding,
      walletBalance: 0,
      openInvoices: [],
      invoiceAllocations: [],
      walletCredit: 0,
      oneTimeApplied: paymentAmount,
      remainingOutstanding: Math.max(0, roundMoney(outstanding - paymentAmount)),
    };
  }

  const walletQuery = RecurringServiceWallet.findOne({ serviceId });
  if (session) walletQuery.session(session);
  const wallet = await walletQuery.lean();
  const walletBalance = roundMoney(wallet?.balance || 0);

  const openInvoices = await loadOpenInvoicesForService(serviceId, session);
  const dueInvoices = openInvoices.filter((inv) => inv.isAllocatable);
  const outstanding = roundMoney(dueInvoices.reduce((sum, inv) => sum + inv.openAmount, 0));

  let remaining = paymentAmount;
  const invoiceAllocations = [];

  for (const inv of dueInvoices) {
    if (remaining <= 0) break;
    const apply = roundMoney(Math.min(remaining, inv.openAmount));
    if (apply <= 0) continue;
    invoiceAllocations.push({
      invoiceId: inv._id,
      periodLabel: inv.periodLabel,
      amount: apply,
      openBefore: inv.openAmount,
      remainingAfter: roundMoney(inv.openAmount - apply),
    });
    remaining = roundMoney(remaining - apply);
  }

  const walletCredit = remaining;

  return {
    billingModel: "recurring",
    serviceId: service._id,
    serviceName,
    outstanding,
    walletBalance,
    openInvoices: openInvoices.map((inv) => ({
      invoiceId: inv._id,
      periodLabel: inv.periodLabel,
      openAmount: inv.openAmount,
      status: inv.status,
      isDue: inv.isAllocatable,
    })),
    invoiceAllocations,
    walletCredit,
    oneTimeApplied: 0,
    remainingOutstanding: roundMoney(
      outstanding - invoiceAllocations.reduce((sum, row) => sum + row.amount, 0)
    ),
  };
};

const applyCycleInvoicePayment = async (invoiceId, amount, session) => {
  const invoice = await BillingCycleInvoice.findById(invoiceId).session(session);
  if (!invoice) throw new ApiError(404, "Recurring invoice not found");

  const open = getInvoiceOpenAmount(invoice);
  if (amount > open) throw new ApiError(400, "Payment exceeds invoice balance");

  invoice.amountPaid = roundMoney(invoice.amountPaid + amount);
  invoice.status = deriveInvoiceStatus(invoice);
  if (invoice.status === "paid") invoice.paidAt = new Date();
  await invoice.save({ session });
  return invoice;
};

const executeAllocationPlan = async (
  { clientPayment, serviceId, plan, paymentDate, method, notes, adminName },
  session
) => {
  const results = [];

  if (plan.billingModel === "one_time") {
    const [paymentAllocation] = await PaymentAllocation.create(
      [
        {
          clientPaymentId: clientPayment._id,
          targetType: "one_time_service",
          targetId: serviceId,
          amount: plan.oneTimeApplied,
        },
      ],
      { session }
    );

    await createPayment(
      serviceId,
      {
        amount: plan.oneTimeApplied,
        paymentDate: paymentDate || new Date(),
        method: method || "UPI",
        notes: notes || `Allocated from client payment ${clientPayment._id}`,
      },
      adminName,
      session
    );
    results.push(paymentAllocation);
    return results;
  }

  for (const row of plan.invoiceAllocations) {
    const [paymentAllocation] = await PaymentAllocation.create(
      [
        {
          clientPaymentId: clientPayment._id,
          targetType: "cycle_invoice",
          targetId: row.invoiceId,
          amount: row.amount,
        },
      ],
      { session }
    );
    await applyCycleInvoicePayment(row.invoiceId, row.amount, session);
    results.push(paymentAllocation);
  }

  if (plan.walletCredit > 0) {
    const [paymentAllocation] = await PaymentAllocation.create(
      [
        {
          clientPaymentId: clientPayment._id,
          targetType: "recurring_wallet",
          targetId: serviceId,
          amount: plan.walletCredit,
        },
      ],
      { session }
    );
    await addCredit(
      serviceId,
      plan.walletCredit,
      {
        referenceType: "client_payment",
        referenceId: clientPayment._id,
        notes: notes || "Excess payment after invoices cleared",
        createdBy: adminName,
      },
      session
    );
    results.push(paymentAllocation);
  }

  return results;
};

const previewClientPayment = async (payload) => {
  const { clientId, totalAmount, paymentDate, method, notes, splits: rawSplits, serviceId } =
    payload;

  if (!clientId) throw new ApiError(400, "Client is required");

  const splits = resolvePaymentSplits({ serviceId, totalAmount, splits: rawSplits });
  const total = roundMoney(totalAmount);
  const splitSum = roundMoney(splits.reduce((sum, row) => sum + row.amount, 0));
  if (splitSum !== total) {
    throw new ApiError(400, "Split amounts must equal total payment");
  }

  const plans = [];
  for (const split of splits) {
    const service = await Service.findOne({ _id: split.serviceId, clientId }).lean();
    if (!service) throw new ApiError(404, "Service not found for this client");
    const plan = await buildAllocationPlan(split.serviceId, split.amount);
    plans.push({ ...plan, splitAmount: split.amount });
  }

  return {
    totalAmount: total,
    singleService: splits.length === 1,
    plans,
    plan: plans.length === 1 ? plans[0] : null,
  };
};

const resolvePaymentSplits = ({ serviceId, totalAmount, splits }) => {
  if (Array.isArray(splits) && splits.length) {
    return splits.map((row) => ({
      serviceId: row.serviceId,
      amount: roundMoney(row.amount),
    }));
  }
  if (!serviceId) throw new ApiError(400, "Service is required");
  return [{ serviceId, amount: roundMoney(totalAmount) }];
};

const createClientPaymentWithAllocations = async (payload, adminName) => {
  const { clientId, totalAmount, paymentDate, method, notes, splits: rawSplits, serviceId } =
    payload;

  if (!clientId) throw new ApiError(400, "Client is required");

  const splits = resolvePaymentSplits({ serviceId, totalAmount, splits: rawSplits });
  const total = roundMoney(totalAmount);
  if (total <= 0) throw new ApiError(400, "Payment amount must be greater than 0");

  const splitSum = roundMoney(splits.reduce((sum, row) => sum + row.amount, 0));
  if (splitSum !== total) {
    throw new ApiError(400, "Split amounts must equal total payment");
  }

  for (const split of splits) {
    const service = await Service.findOne({ _id: split.serviceId, clientId });
    if (!service) throw new ApiError(404, "Service not found for this client");
    if (split.amount <= 0) throw new ApiError(400, "Each split amount must be greater than 0");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [clientPayment] = await ClientPayment.create(
      [
        {
          clientId,
          serviceId: splits.length === 1 ? splits[0].serviceId : null,
          totalAmount: total,
          paymentDate: paymentDate || new Date(),
          method: method || "UPI",
          notes: notes || "",
          createdBy: adminName,
        },
      ],
      { session }
    );

    const allAllocations = [];
    const plans = [];

    for (const split of splits) {
      const plan = await buildAllocationPlan(split.serviceId, split.amount, session);
      const allocations = await executeAllocationPlan(
        {
          clientPayment,
          serviceId: split.serviceId,
          plan,
          paymentDate,
          method,
          notes,
          adminName,
        },
        session
      );
      allAllocations.push(...allocations);
      plans.push({ ...plan, splitAmount: split.amount });
    }

    await session.commitTransaction();
    return {
      clientPayment,
      allocations: allAllocations,
      plans,
      plan: plans.length === 1 ? plans[0] : null,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const enrichAllocations = async (allocations) => {
  if (!allocations.length) return [];

  const invoiceIds = allocations
    .filter((a) => a.targetType === "cycle_invoice")
    .map((a) => a.targetId);

  const invoices = invoiceIds.length
    ? await BillingCycleInvoice.find({ _id: { $in: invoiceIds } }).lean()
    : [];
  const cycleIds = invoices.map((i) => i.billingCycleId);
  const cycles = cycleIds.length ? await BillingCycle.find({ _id: { $in: cycleIds } }).lean() : [];
  const cycleMap = Object.fromEntries(cycles.map((c) => [c._id.toString(), c]));
  const invoiceMap = Object.fromEntries(
    invoices.map((inv) => {
      const cycle = cycleMap[inv.billingCycleId?.toString()];
      return [
        inv._id.toString(),
        {
          periodLabel: cycle ? formatPeriodLabel(new Date(cycle.periodMonth)) : null,
        },
      ];
    })
  );

  const serviceIds = [
    ...new Set(
      allocations
        .filter((a) => ["one_time_service", "recurring_wallet"].includes(a.targetType))
        .map((a) => a.targetId.toString())
    ),
  ];
  const services = serviceIds.length
    ? await Service.find({ _id: { $in: serviceIds } }).select("name projectTitle").lean()
    : [];
  const serviceMap = Object.fromEntries(services.map((s) => [s._id.toString(), s]));

  return allocations.map((row) => {
    const base = {
      ...row,
      targetTypeLabel: allocationTypeLabel(row.targetType),
    };
    if (row.targetType === "cycle_invoice") {
      return {
        ...base,
        periodLabel: invoiceMap[row.targetId.toString()]?.periodLabel || null,
      };
    }
    const svc = serviceMap[row.targetId.toString()];
    return {
      ...base,
      serviceName: svc?.name || svc?.projectTitle || null,
    };
  });
};

const listClientPayments = async (clientId, { limit = 50 } = {}) => {
  const payments = await ClientPayment.find({ clientId })
    .sort({ paymentDate: -1 })
    .limit(limit)
    .lean();
  const ids = payments.map((p) => p._id);
  const allocations = await PaymentAllocation.find({ clientPaymentId: { $in: ids } }).lean();
  const byPayment = allocations.reduce((acc, row) => {
    const key = row.clientPaymentId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const enriched = await Promise.all(
    payments.map(async (payment) => ({
      ...payment,
      allocations: await enrichAllocations(byPayment[payment._id.toString()] || []),
    }))
  );

  return enriched;
};

module.exports = {
  buildAllocationPlan,
  previewClientPayment,
  createClientPaymentWithAllocations,
  listClientPayments,
  applyCycleInvoicePayment,
};
