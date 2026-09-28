const Service = require("../models/Service");
const Deliverable = require("../models/Deliverable");
const Freelancer = require("../models/Freelancer");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const { syncServiceFromDeliverables } = require("../services/deliverable.service");
const { recomputeServicePaymentSummary } = require("../services/servicePayment.service");
const { syncRecurringServiceFinancials } = require("./financialMetrics");
const { recomputeAllProjectPayments } = require("./recomputeAllProjectPayments");
const { syncFreelancerProjectCount } = require("../services/deliverableAssignment.service");
const { syncDueForAssignment } = require("../services/freelancerDue.service");
const { activeAssignmentFilter } = require("../services/serviceCalculations.service");
const { invalidatePrefix } = require("./responseCache");

const recomputeAllServiceFinancials = async () => {
  const services = await Service.find({}).select("_id billingModel").lean();
  let updated = 0;
  let errors = 0;

  for (const service of services) {
    try {
      if (service.billingModel === "recurring") {
        await syncRecurringServiceFinancials(service._id);
      } else {
        const hasDeliverables = await Deliverable.exists({
          serviceId: service._id,
          deletedAt: null,
        });
        if (hasDeliverables) {
          await syncServiceFromDeliverables(service._id);
        } else {
          await recomputeServicePaymentSummary(service._id);
        }
      }
      updated += 1;
    } catch (err) {
      errors += 1;
      console.error(`[deploy-reconcile] service ${service._id}:`, err.message);
    }
  }

  return { total: services.length, updated, errors };
};

const reconcileFreelancerProjectCounts = async () => {
  const ids = await Freelancer.find({}).distinct("_id");
  for (const id of ids) {
    await syncFreelancerProjectCount(id);
  }
  return { freelancers: ids.length };
};

const reconcileFreelancerDuesFromAssignments = async () => {
  const assignments = await DeliverableAssignment.find({ ...activeAssignmentFilter }).lean();
  let synced = 0;
  let errors = 0;

  for (const assignment of assignments) {
    try {
      await syncDueForAssignment(assignment);
      synced += 1;
    } catch (err) {
      errors += 1;
      console.error(`[deploy-reconcile] assignment ${assignment._id}:`, err.message);
    }
  }

  return { assignments: assignments.length, synced, errors };
};

const reconcileAllCrmData = async () => {
  const [services, legacyProjects, freelancers, dues] = await Promise.all([
    recomputeAllServiceFinancials(),
    recomputeAllProjectPayments(),
    reconcileFreelancerProjectCounts(),
    reconcileFreelancerDuesFromAssignments(),
  ]);

  invalidatePrefix("analytics:");

  return {
    services,
    legacyProjects,
    freelancers,
    dues,
  };
};

module.exports = {
  recomputeAllServiceFinancials,
  reconcileFreelancerProjectCounts,
  reconcileFreelancerDuesFromAssignments,
  reconcileAllCrmData,
};
