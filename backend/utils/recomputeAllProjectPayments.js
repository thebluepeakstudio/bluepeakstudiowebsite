const Project = require("../models/Project");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const ProjectPayment = require("../models/ProjectPayment");
const { syncProjectFromDeliverables } = require("../services/projectDeliverable.service");
const { recomputeProjectPaymentSummary } = require("../services/projectPayment.service");
const { invalidatePrefix } = require("./responseCache");

/**
 * Reconcile project.totalAmount, remainingAmount, paymentStatus, and advanceReceived
 * from deliverables + ProjectPayment ledger for every project.
 */
const recomputeAllProjectPayments = async () => {
  const projects = await Project.find({}).select("_id advanceReceived").lean();
  let updated = 0;
  let paymentsMigrated = 0;
  let errors = 0;

  for (const project of projects) {
    try {
      const hasDeliverables = await ProjectDeliverable.exists({
        projectId: project._id,
        deletedAt: null,
      });

      const paymentCount = await ProjectPayment.countDocuments({ projectId: project._id });
      const legacyAdvance = Number(project.advanceReceived) || 0;

      if (!paymentCount && legacyAdvance > 0) {
        await ProjectPayment.create({
          projectId: project._id,
          amount: legacyAdvance,
          paymentDate: new Date(),
          method: "UPI",
          notes: "Migrated from legacy advance received during payment summary reconciliation",
          recordedBy: "migration",
        });
        paymentsMigrated += 1;
      }

      if (hasDeliverables) {
        await syncProjectFromDeliverables(project._id);
      } else {
        await recomputeProjectPaymentSummary(project._id);
      }

      updated += 1;
    } catch (err) {
      errors += 1;
      console.error(`[payment-recompute] project ${project._id}:`, err.message);
    }
  }

  invalidatePrefix("analytics:");

  return {
    total: projects.length,
    updated,
    paymentsMigrated,
    errors,
  };
};

module.exports = { recomputeAllProjectPayments };
