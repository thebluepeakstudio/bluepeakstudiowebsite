const Brand = require("../models/Brand");
const Service = require("../models/Service");
const ApiError = require("../utils/ApiError");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const RecurringServiceWallet = require("../models/RecurringServiceWallet");
const { roundMoney } = require("../utils/recurringDates");
const { enrichServicesWithDeliverables } = require("./serviceCalculations.service");
const { withLegacyServiceFields } = require("../utils/serviceCompat");

const getBrandDashboard = async (brandId) => {
  const brand = await Brand.findById(brandId).lean();
  if (!brand) return null;

  const services = await Service.find({ brandId }).sort({ createdAt: -1 }).lean();
  const enriched = await enrichServicesWithDeliverables(services);
  const serviceIds = services.map((s) => s._id);

  const configs = await RecurringServiceConfig.find({
    serviceId: { $in: serviceIds },
    status: "active",
  }).lean();

  const mrr = roundMoney(
    configs.reduce((sum, c) => sum + (Number(c.monthlyClientAmount) || 0), 0)
  );

  const oneTimeOutstanding = roundMoney(
    services
      .filter((s) => s.billingModel !== "recurring")
      .reduce((sum, s) => sum + Math.max(0, Number(s.remainingAmount) || 0), 0)
  );

  const openInvoices = await BillingCycleInvoice.find({
    serviceId: { $in: serviceIds },
    status: { $in: ["due", "partial", "overdue", "upcoming"] },
  }).lean();

  const wallets = await RecurringServiceWallet.find({ serviceId: { $in: serviceIds } }).lean();
  const walletByService = Object.fromEntries(wallets.map((w) => [w.serviceId.toString(), w.balance]));

  const recurringOutstanding = roundMoney(
    openInvoices.reduce((sum, inv) => {
      const open = Math.max(0, roundMoney(inv.amountDue - inv.creditApplied - inv.amountPaid));
      const wallet = walletByService[inv.serviceId.toString()] || 0;
      return sum + Math.max(0, open - wallet);
    }, 0)
  );

  const paidInvoices = await BillingCycleInvoice.aggregate([
    { $match: { serviceId: { $in: serviceIds }, status: "paid" } },
    { $group: { _id: null, total: { $sum: { $add: ["$amountPaid", "$creditApplied"] } } } },
  ]);

  const lifetimeOneTime = roundMoney(
    services
      .filter((s) => s.billingModel !== "recurring")
      .reduce((sum, s) => sum + (Number(s.advanceReceived) || 0), 0)
  );

  return {
    brand,
    services: enriched.map(withLegacyServiceFields),
    mrr,
    outstanding: roundMoney(oneTimeOutstanding + recurringOutstanding),
    lifetimeRevenue: roundMoney(lifetimeOneTime + (paidInvoices[0]?.total || 0)),
    recurringRevenue: roundMoney(paidInvoices[0]?.total || 0),
  };
};

const moveServiceToBrand = async (brandId, serviceId) => {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(404, "Brand not found");

  const service = await Service.findById(serviceId);
  if (!service) throw new ApiError(404, "Service not found");

  if (service.clientId.toString() !== brand.clientId.toString()) {
    throw new ApiError(400, "Brand must belong to the same client");
  }

  service.brandId = brand._id;
  await service.save();
  return service.toObject();
};

module.exports = { getBrandDashboard, moveServiceToBrand };
