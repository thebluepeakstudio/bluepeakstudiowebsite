const Deliverable = require("../models/Deliverable");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const FreelancerPayment = require("../models/FreelancerPayment");
const FreelancerDue = require("../models/FreelancerDue");
const ClientPayment = require("../models/ClientPayment");
const PaymentAllocation = require("../models/PaymentAllocation");
const ServicePayment = require("../models/ServicePayment");
const ProjectPayment = require("../models/ProjectPayment");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const BillingCycleFreelancerDue = require("../models/BillingCycleFreelancerDue");
const RecurringServiceConfig = require("../models/RecurringServiceConfig");
const RecurringDeliverableTemplate = require("../models/RecurringDeliverableTemplate");
const RecurringServiceWallet = require("../models/RecurringServiceWallet");
const WalletTransaction = require("../models/WalletTransaction");
const { removeAssignmentsForDeliverable } = require("./deliverableAssignment.service");

const sessionOpts = (session) => (session ? { session } : undefined);

const deleteOrphanClientPayments = async (clientPaymentIds, session = null) => {
  const unique = [...new Set(clientPaymentIds.filter(Boolean).map(String))];
  for (const clientPaymentId of unique) {
    const remaining = await PaymentAllocation.countDocuments({ clientPaymentId }).session(
      session || null
    );
    if (remaining === 0) {
      await ClientPayment.findByIdAndDelete(clientPaymentId, sessionOpts(session));
    }
  }
};

const purgeClientPaymentLinksForOwner = async (ownerId, session = null) => {
  const ownerTargetTypes = ["one_time_service", "recurring_wallet"];
  const ownerAllocations = await PaymentAllocation.find({
    targetId: ownerId,
    targetType: { $in: ownerTargetTypes },
  })
    .select("clientPaymentId")
    .lean()
    .session(session || null);

  await PaymentAllocation.deleteMany(
    { targetId: ownerId, targetType: { $in: ownerTargetTypes } },
    sessionOpts(session)
  );

  await ClientPayment.deleteMany({ serviceId: ownerId }, sessionOpts(session));

  await deleteOrphanClientPayments(
    ownerAllocations.map((row) => row.clientPaymentId),
    session
  );
};

const purgeRecurringBillingForService = async (serviceId, session = null) => {
  const cycleIds = await BillingCycle.find({ serviceId }).distinct("_id").session(session || null);

  const invoiceIds = await BillingCycleInvoice.find({ serviceId })
    .distinct("_id")
    .session(session || null);

  if (invoiceIds.length) {
    const invoiceAllocations = await PaymentAllocation.find({
      targetType: "cycle_invoice",
      targetId: { $in: invoiceIds },
    })
      .select("clientPaymentId")
      .lean()
      .session(session || null);

    await PaymentAllocation.deleteMany(
      { targetType: "cycle_invoice", targetId: { $in: invoiceIds } },
      sessionOpts(session)
    );

    await deleteOrphanClientPayments(
      invoiceAllocations.map((row) => row.clientPaymentId),
      session
    );
  }

  if (cycleIds.length) {
    await BillingCycleDeliverable.deleteMany(
      { billingCycleId: { $in: cycleIds } },
      sessionOpts(session)
    );
    await BillingCycleFreelancerDue.deleteMany(
      { billingCycleId: { $in: cycleIds } },
      sessionOpts(session)
    );
  }

  await Promise.all([
    BillingCycleInvoice.deleteMany({ serviceId }, sessionOpts(session)),
    BillingCycle.deleteMany({ serviceId }, sessionOpts(session)),
    RecurringServiceConfig.deleteMany({ serviceId }, sessionOpts(session)),
    RecurringDeliverableTemplate.deleteMany({ serviceId }, sessionOpts(session)),
    RecurringServiceWallet.deleteMany({ serviceId }, sessionOpts(session)),
    WalletTransaction.deleteMany({ serviceId }, sessionOpts(session)),
    FreelancerDue.deleteMany({ serviceId }, sessionOpts(session)),
  ]);
};

/** Remove assignments, freelancer payouts, dues, and client payment links for a CRM service (project). */
const purgeOneTimeServiceFinancials = async (serviceId, session = null) => {
  const deliverableIds = await Deliverable.find({ serviceId }).distinct("_id").session(session || null);

  for (const deliverableId of deliverableIds) {
    await removeAssignmentsForDeliverable(deliverableId, session);
  }

  await Promise.all([
    FreelancerPayment.deleteMany({ projectId: serviceId }, sessionOpts(session)),
    FreelancerDue.deleteMany({ serviceId }, sessionOpts(session)),
    ServicePayment.deleteMany({ serviceId }, sessionOpts(session)),
  ]);

  await purgeClientPaymentLinksForOwner(serviceId, session);
};

/** Legacy Project collection cleanup (same owner id semantics for freelancer payments). */
const purgeLegacyProjectFinancials = async (projectId, session = null) => {
  const deliverableIds = await ProjectDeliverable.find({ projectId })
    .distinct("_id")
    .session(session || null);

  for (const deliverableId of deliverableIds) {
    await removeAssignmentsForDeliverable(deliverableId, session);
  }

  await Promise.all([
    FreelancerPayment.deleteMany({ projectId }, sessionOpts(session)),
    ProjectPayment.deleteMany({ projectId }, sessionOpts(session)),
  ]);
};

const deleteCrmService = async (service) => {
  const serviceId = service._id;

  if (service.billingModel === "recurring") {
    await purgeRecurringBillingForService(serviceId);
  }

  await purgeOneTimeServiceFinancials(serviceId);

  await Deliverable.updateMany({ serviceId }, { deletedAt: new Date() });
};

const deleteLegacyProject = async (projectId) => {
  await purgeLegacyProjectFinancials(projectId);
  await ProjectDeliverable.updateMany({ projectId }, { deletedAt: new Date() });
};

module.exports = {
  purgeOneTimeServiceFinancials,
  purgeLegacyProjectFinancials,
  purgeRecurringBillingForService,
  purgeClientPaymentLinksForOwner,
  deleteCrmService,
  deleteLegacyProject,
};
