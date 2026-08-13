const Project = require("../../models/Project");
const Service = require("../../models/Service");
const Deliverable = require("../../models/Deliverable");
const Expense = require("../../models/Expense");
const Freelancer = require("../../models/Freelancer");
const Lead = require("../../models/Lead");
const BillingCycleInvoice = require("../../models/BillingCycleInvoice");
const asyncHandler = require("../../utils/asyncHandler");
const { get, set, invalidatePrefix } = require("../../utils/responseCache");
const { withLegacyServiceFields } = require("../../utils/serviceCompat");
const {
  activeDeliverableFilter,
  groupDeliverablesByService,
  buildServicesSummary,
} = require("../../services/serviceCalculations.service");
const {
  getSharedFinancialMetrics,
  aggregatePaymentsReceivedThisMonth,
} = require("../../utils/financialMetrics");
const { runDaily } = require("../../services/recurringBillingJob.service");
const { toSafeRegex } = require("../../utils/escapeRegex");
const { roundMoney } = require("../../utils/recurringDates");

const FINANCIAL_CACHE_KEY = "analytics:financial";
const FINANCIAL_CACHE_TTL = 120_000;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const loadDashboardAlerts = async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const followUpBase = {
    nextFollowUpDate: { $exists: true, $ne: null },
    followUpStatus: { $ne: "Completed" },
    status: { $nin: ["Won", "Lost"] },
  };

  const [followUpsToday, dueInvoices] = await Promise.all([
    Lead.find({
      ...followUpBase,
      nextFollowUpDate: { $gte: todayStart, $lte: todayEnd },
    })
      .select("fullName companyName nextFollowUpDate reminderNotes followUpStatus status")
      .sort({ nextFollowUpDate: 1 })
      .limit(10)
      .lean(),
    BillingCycleInvoice.find({
      status: { $in: ["due", "partial", "overdue"] },
    })
      .select("serviceId amountDue creditApplied amountPaid dueDate status")
      .populate("serviceId", "clientName businessName name")
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
  ]);

  const paymentsDue = dueInvoices
    .map((inv) => {
      const open = roundMoney(
        (Number(inv.amountDue) || 0) -
          (Number(inv.creditApplied) || 0) -
          (Number(inv.amountPaid) || 0)
      );
      if (open <= 0) return null;
      const service = inv.serviceId || {};
      return {
        _id: inv._id,
        serviceId: service._id || inv.serviceId,
        clientName: service.clientName || "—",
        businessName: service.businessName || "",
        projectName: service.name || "",
        amountDue: open,
        dueDate: inv.dueDate,
        status: inv.status,
      };
    })
    .filter(Boolean);

  return {
    followUpsToday,
    followUpsOverdue: [],
    paymentsDue,
  };
};

const loadCachedFinancialMetrics = async () => {
  const cached = get(FINANCIAL_CACHE_KEY);
  if (cached) return cached;
  const metrics = await getSharedFinancialMetrics();
  set(FINANCIAL_CACHE_KEY, metrics, FINANCIAL_CACHE_TTL);
  return metrics;
};

const withFinancialMetrics = (payload, financials) => {
  if (!payload?.data) return payload;

  if (payload.data.cards) {
    return {
      ...payload,
      data: {
        ...payload.data,
        cards: {
          ...payload.data.cards,
          clientOutstanding: financials.clientOutstanding,
          pendingPayments: financials.clientOutstanding,
          totalRevenue: financials.totalRevenue,
          totalExpenses: financials.totalExpenses,
          totalDecree: financials.totalDecree,
          netProfit: financials.netProfit,
        },
      },
    };
  }

  return {
    ...payload,
    data: {
      ...payload.data,
      totalRevenue: financials.totalRevenue,
      totalExpenses: financials.totalExpenses,
      totalDecree: financials.totalDecree,
      grossProfit: financials.grossProfit,
      netProfit: financials.netProfit,
      clientOutstanding: financials.clientOutstanding,
      pendingPayments: financials.clientOutstanding,
      freelancerCosts: financials.freelancerCosts,
    },
  };
};

/** Attach service labels only — keep stored work/payment status from Service. */
const attachLatestServiceLabels = async (services) => {
  if (!services.length) return [];
  const ids = services.map((s) => s._id);
  const deliverables = await Deliverable.find({
    serviceId: { $in: ids },
    ...activeDeliverableFilter,
  })
    .select("serviceId title status category")
    .lean();

  const byService = groupDeliverablesByService(deliverables);

  return services.map((s) => {
    const legacy = withLegacyServiceFields(s);
    const list = byService[s._id.toString()] || [];
    if (list.length) {
      return {
        ...legacy,
        ...buildServicesSummary(list),
      };
    }
    return {
      ...legacy,
      services: legacy.category ? [legacy.category] : [],
      servicesCount: legacy.category ? 1 : 0,
    };
  });
};

const getDashboard = asyncHandler(async (req, res) => {
  try {
    await runDaily();
  } catch (err) {
    console.error("[recurring-billing] Dashboard sync failed:", err.message);
  }

  const cacheKey = "analytics:dashboard";
  const financials = await loadCachedFinancialMetrics();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeProjects, latestServices, paymentsThisMonth] = await Promise.all([
    Service.countDocuments({ workStatus: { $nin: ["Completed", "Delivered"] } }),
    Service.find()
      .select(
        "clientName businessName name category billingModel workStatus paymentStatus totalPrice remainingAmount advanceReceived createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    aggregatePaymentsReceivedThisMonth(monthStart),
  ]);

  const enrichedLatestProjects = await attachLatestServiceLabels(latestServices);
  const alerts = await loadDashboardAlerts();

  const cached = get(cacheKey);
  if (cached?.data?.cards) {
    return res.json(
      withFinancialMetrics(
        {
          ...cached,
          data: {
            ...cached.data,
            cards: {
              ...cached.data.cards,
              activeProjects,
              paymentsReceivedThisMonth: paymentsThisMonth,
            },
            latestProjects: enrichedLatestProjects,
            alerts,
          },
        },
        financials
      )
    );
  }

  const payload = {
    success: true,
    data: {
      cards: {
        activeProjects,
        clientOutstanding: financials.clientOutstanding,
        pendingPayments: financials.clientOutstanding,
        totalRevenue: financials.totalRevenue,
        totalExpenses: financials.totalExpenses,
        netProfit: financials.netProfit,
        paymentsReceivedThisMonth: paymentsThisMonth,
      },
      latestProjects: enrichedLatestProjects,
      alerts,
    },
  };

  set(cacheKey, payload, 30_000);
  res.json(withFinancialMetrics(payload, financials));
});

const getPL = asyncHandler(async (req, res) => {
  const cacheKey = "analytics:pl";
  const financials = await loadCachedFinancialMetrics();
  const cached = get(cacheKey);
  if (cached) {
    return res.json(withFinancialMetrics(cached, financials));
  }

  const payload = {
    success: true,
    data: {
      totalRevenue: financials.totalRevenue,
      totalExpenses: financials.totalExpenses,
      totalDecree: financials.totalDecree,
      grossProfit: financials.grossProfit,
      netProfit: financials.netProfit,
      clientOutstanding: financials.clientOutstanding,
      pendingPayments: financials.clientOutstanding,
      freelancerCosts: financials.freelancerCosts,
    },
  };

  set(cacheKey, payload, 120_000);
  res.json(withFinancialMetrics(payload, financials));
});

const globalSearch = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) {
    return res.json({ success: true, data: { projects: [], freelancers: [], expenses: [] } });
  }

  const pattern = toSafeRegex(q);
  if (!pattern) {
    return res.json({ success: true, data: { projects: [], freelancers: [], expenses: [] } });
  }

  const [services, legacyProjects, freelancers, expenses] = await Promise.all([
    Service.find({
      $or: [{ clientName: pattern }, { name: pattern }, { businessName: pattern }],
    })
      .select("name clientName workStatus paymentStatus")
      .limit(10)
      .lean(),
    Project.find({
      $or: [{ clientName: pattern }, { projectTitle: pattern }, { businessName: pattern }],
    })
      .select("projectTitle clientName workStatus paymentStatus")
      .limit(10)
      .lean(),
    Freelancer.find({ $or: [{ name: pattern }, { email: pattern }] })
      .select("name email availabilityStatus")
      .limit(10)
      .lean(),
    Expense.find({ title: pattern }).select("title amount category expenseDate").limit(10).lean(),
  ]);

  const projects = [
    ...services.map((s) => ({
      ...withLegacyServiceFields(s),
      projectTitle: s.name,
    })),
    ...legacyProjects,
  ].slice(0, 10);

  res.json({ success: true, data: { projects, freelancers, expenses } });
});

module.exports = { getDashboard, getPL, globalSearch, invalidateAnalyticsCache: () => invalidatePrefix("analytics:") };
