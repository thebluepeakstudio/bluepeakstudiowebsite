const FreelancerDue = require("../models/FreelancerDue");
const BillingCycleFreelancerDue = require("../models/BillingCycleFreelancerDue");
const { roundMoney } = require("./recurringDates");
const { formatPeriodLabel } = require("./recurringDates");

const listOpenFreelancerDues = async (freelancerId) => {
  const dues = await FreelancerDue.find({
    freelancerId,
    status: { $in: ["pending", "partial"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return dues.map((due) => ({
    _id: due._id,
    freelancerDueId: due._id,
    assignmentId: due.deliverableAssignmentId,
    serviceId: due.serviceId,
    projectId: due.serviceId,
    deliverableId: due.deliverableId || due.billingCycleDeliverableId,
    service: {
      clientName: due.clientName,
      businessName: due.brandName,
      name: due.serviceTitle,
      projectTitle: due.serviceTitle,
    },
    project: {
      clientName: due.clientName,
      businessName: due.brandName,
      name: due.serviceTitle,
      projectTitle: due.serviceTitle,
    },
    deliverable: {
      title: due.deliverableTitle,
      status: due.status,
    },
    cost: due.amount,
    amountPaid: due.amountPaid,
    paymentStatus: due.status,
    due: Math.max(0, roundMoney(due.amount - due.amountPaid)),
    status: due.status,
    billingMonthLabel: due.billingMonth
      ? formatPeriodLabel(new Date(due.billingMonth))
      : null,
    recurringCycleDue: !!due.billingCycleId,
  }));
};

const listOpenCycleFreelancerDues = async (freelancerId) => {
  const unified = await listOpenFreelancerDues(freelancerId);
  if (unified.length) return unified;

  const legacyDues = await BillingCycleFreelancerDue.find({
    freelancerId,
    status: { $in: ["due", "pending", "partial", "upcoming"] },
  }).lean();

  return legacyDues
    .filter((d) => roundMoney(d.amountDue - d.amountPaid) > 0)
    .map((due) => ({
      _id: due._id,
      billingCycleFreelancerDueId: due._id,
      serviceId: due.serviceId,
      projectId: due.serviceId,
      cost: due.amountDue,
      amountPaid: due.amountPaid,
      due: Math.max(0, roundMoney(due.amountDue - due.amountPaid)),
      recurringCycleDue: true,
      status: due.status,
    }));
};

const sumOpenCycleFreelancerDues = async (freelancerId = null) => {
  const filter = { status: { $in: ["pending", "partial"] } };
  if (freelancerId) filter.freelancerId = freelancerId;

  const rows = await FreelancerDue.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $subtract: [{ $ifNull: ["$amount", 0] }, { $ifNull: ["$amountPaid", 0] }],
          },
        },
      },
    },
  ]);
  const unified = roundMoney(rows[0]?.total || 0);
  if (unified > 0 || freelancerId) return unified;

  const legacyFilter = { status: { $in: ["due", "pending", "partial"] } };
  const legacyRows = await BillingCycleFreelancerDue.aggregate([
    { $match: legacyFilter },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $subtract: [{ $ifNull: ["$amountDue", 0] }, { $ifNull: ["$amountPaid", 0] }],
          },
        },
      },
    },
  ]);
  return roundMoney(legacyRows[0]?.total || 0);
};

module.exports = {
  listOpenFreelancerDues,
  listOpenCycleFreelancerDues,
  sumOpenCycleFreelancerDues,
};
