const RecurringServiceWallet = require("../models/RecurringServiceWallet");
const WalletTransaction = require("../models/WalletTransaction");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const { roundMoney } = require("../utils/recurringDates");

const getOrCreateWallet = async (serviceId, session = null) => {
  const opts = session ? { session } : {};
  let wallet = await RecurringServiceWallet.findOne({ serviceId }).session(session || null);
  if (!wallet) {
    [wallet] = await RecurringServiceWallet.create([{ serviceId, balance: 0 }], opts);
  }
  return wallet;
};

const addCredit = async (serviceId, amount, { referenceType, referenceId, notes, createdBy }, session = null) => {
  const credit = roundMoney(amount);
  if (credit <= 0) return null;

  const wallet = await getOrCreateWallet(serviceId, session);
  wallet.balance = roundMoney(wallet.balance + credit);
  await wallet.save(session ? { session } : undefined);

  const [txn] = await WalletTransaction.create(
    [
      {
        serviceId,
        type: "credit_add",
        amount: credit,
        balanceAfter: wallet.balance,
        referenceType: referenceType || "client_payment",
        referenceId: referenceId || null,
        notes: notes || "",
        createdBy: createdBy || "",
      },
    ],
    session ? { session } : undefined
  );
  return { wallet, txn };
};

const listWalletTransactions = async (serviceId, { limit = 50 } = {}) => {
  const wallet = await RecurringServiceWallet.findOne({ serviceId }).lean();
  const transactions = await WalletTransaction.find({ serviceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return {
    balance: wallet?.balance || 0,
    transactions,
  };
};

const deriveInvoiceStatus = (invoice) => {
  const amountDue = roundMoney(invoice.amountDue);
  const creditApplied = roundMoney(invoice.creditApplied);
  const amountPaid = roundMoney(invoice.amountPaid);
  const settled = roundMoney(creditApplied + amountPaid);

  if (settled >= amountDue && amountDue > 0) return "paid";
  if (settled > 0) return "partial";
  const now = new Date();
  if (invoice.dueDate && new Date(invoice.dueDate) < now) return "overdue";
  if (invoice.status === "upcoming") return "upcoming";
  return "due";
};

const autoApplyWalletCredit = async (serviceId, session = null) => {
  const wallet = await RecurringServiceWallet.findOne({ serviceId }).session(session || null);
  if (!wallet || wallet.balance <= 0) return { applied: 0, invoicesUpdated: 0 };

  const openInvoices = await BillingCycleInvoice.find({
    serviceId,
    status: { $in: ["due", "partial", "overdue"] },
  })
    .sort({ dueDate: 1 })
    .session(session || null);

  let remaining = roundMoney(wallet.balance);
  let applied = 0;
  let invoicesUpdated = 0;

  for (const invoice of openInvoices) {
    if (remaining <= 0) break;
    const amountDue = roundMoney(invoice.amountDue);
    const alreadySettled = roundMoney(invoice.creditApplied + invoice.amountPaid);
    const open = roundMoney(amountDue - alreadySettled);
    if (open <= 0) continue;

    const applyAmount = roundMoney(Math.min(remaining, open));
    invoice.creditApplied = roundMoney(invoice.creditApplied + applyAmount);
    invoice.status = deriveInvoiceStatus(invoice);
    if (invoice.status === "paid") invoice.paidAt = new Date();
    await invoice.save(session ? { session } : undefined);

    remaining = roundMoney(remaining - applyAmount);
    applied = roundMoney(applied + applyAmount);
    invoicesUpdated += 1;

    await WalletTransaction.create(
      [
        {
          serviceId,
          type: "auto_apply",
          amount: applyAmount,
          balanceAfter: remaining,
          referenceType: "billing_cycle_invoice",
          referenceId: invoice._id,
          notes: "Auto-applied on billing date",
          createdBy: "system",
        },
      ],
      session ? { session } : undefined
    );
  }

  if (applied > 0) {
    wallet.balance = remaining;
    await wallet.save(session ? { session } : undefined);
  }

  return { applied, invoicesUpdated };
};

module.exports = {
  getOrCreateWallet,
  addCredit,
  listWalletTransactions,
  deriveInvoiceStatus,
  autoApplyWalletCredit,
};
