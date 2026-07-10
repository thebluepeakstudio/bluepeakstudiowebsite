const Brand = require("../models/Brand");
const Service = require("../models/Service");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const ClientPayment = require("../models/ClientPayment");
const { roundMoney } = require("../utils/recurringDates");
const { listClientPayments } = require("./clientPaymentAllocation.service");

const getClientDashboard = async (clientId) => {
  const [brands, services, configs, upcomingCycles, recentPayments] = await Promise.all([
    Brand.find({ clientId }).sort({ name: 1 }).lean(),
    Service.find({ clientId }).lean(),
    RecurringServiceConfig.find({ status: "active" })
      .populate({ path: "serviceId", match: { clientId }, select: "_id billingModel" })
      .lean(),
    BillingCycle.find({
      serviceId: { $in: await Service.find({ clientId }).distinct("_id") },
      billingDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
    })
      .sort({ billingDate: 1 })
      .limit(10)
      .lean(),
    listClientPayments(clientId, { limit: 10 }),
  ]);

  const serviceIds = services.map((s) => s._id);
  const oneTimeServices = services.filter((s) => s.billingModel !== "recurring");
  const recurringServices = services.filter((s) => s.billingModel === "recurring");

  const oneTimeOutstanding = roundMoney(
    oneTimeServices.reduce((sum, s) => sum + Math.max(0, Number(s.remainingAmount) || 0), 0)
  );

  const openInvoices = await BillingCycleInvoice.find({
    serviceId: { $in: serviceIds },
    status: { $in: ["due", "partial", "overdue", "upcoming"] },
  })
    .populate("serviceId", "name projectTitle clientName")
    .sort({ dueDate: 1 })
    .lean();

  const recurringOutstanding = roundMoney(
    openInvoices.reduce((sum, inv) => {
      const open = Math.max(0, roundMoney(inv.amountDue - inv.creditApplied - inv.amountPaid));
      return sum + open;
    }, 0)
  );

  const mrr = roundMoney(
    configs
      .filter((c) => c.serviceId)
      .reduce((sum, c) => sum + (Number(c.monthlyClientAmount) || 0), 0)
  );

  const oneTimeRevenue = roundMoney(
    oneTimeServices.reduce((sum, s) => sum + (Number(s.advanceReceived) || 0), 0)
  );

  const paidRecurring = await BillingCycleInvoice.aggregate([
    { $match: { serviceId: { $in: serviceIds }, status: "paid" } },
    { $group: { _id: null, total: { $sum: { $add: ["$amountPaid", "$creditApplied"] } } } },
  ]);

  return {
    brandCount: brands.length,
    activeServiceCount: services.filter((s) =>
      ["Not Started", "In Progress", "Waiting for Client", "Revision"].includes(s.workStatus)
    ).length,
    totalServices: services.length,
    oneTimeServiceCount: oneTimeServices.length,
    recurringServiceCount: recurringServices.length,
    mrr,
    oneTimeRevenue,
    recurringRevenue: roundMoney(paidRecurring[0]?.total || 0),
    lifetimeRevenue: roundMoney(oneTimeRevenue + (paidRecurring[0]?.total || 0)),
    outstanding: roundMoney(oneTimeOutstanding + recurringOutstanding),
    openInvoices: openInvoices.map((inv) => ({
      ...inv,
      openAmount: Math.max(
        0,
        roundMoney(inv.amountDue - inv.creditApplied - inv.amountPaid)
      ),
    })),
    upcomingBilling: upcomingCycles,
    recentPayments,
    brands,
    services: services.map((s) => ({
      ...s,
      name: s.name || s.projectTitle,
      totalPrice: s.totalPrice ?? s.totalAmount,
    })),
  };
};

module.exports = { getClientDashboard };
