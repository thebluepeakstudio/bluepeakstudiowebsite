require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Project = require("../models/Project");
const ProjectDeliverable = require("../models/ProjectDeliverable");
const DeliverableAssignment = require("../models/DeliverableAssignment");
const ProjectPayment = require("../models/ProjectPayment");
const Freelancer = require("../models/Freelancer");
const { normalizeAssignedFreelancers } = require("../utils/projectFreelancerAssignments");

const mapWorkStatus = (workStatus) => {
  const map = {
    "Not Started": "Not Started",
    "In Progress": "In Progress",
    "Waiting for Client": "Waiting For Client",
    Revision: "Review",
    Completed: "Delivered",
    Delivered: "Delivered",
  };
  return map[workStatus] || "Not Started";
};

const inferRole = async (freelancerId, category) => {
  const freelancer = await Freelancer.findById(freelancerId).select("skills").lean();
  if (!freelancer?.skills?.length) return "General";
  if (freelancer.skills.includes(category)) return category;
  return freelancer.skills[0];
};

const migrate = async () => {
  await connectDB();

  const projects = await Project.find({});
  let migrated = 0;
  let skipped = 0;

  for (const project of projects) {
    const existingCount = await ProjectDeliverable.countDocuments({
      projectId: project._id,
      deletedAt: null,
    });
    if (existingCount > 0) {
      skipped += 1;
      continue;
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const status = mapWorkStatus(project.workStatus);
      const title = project.projectType || "General Service";

      const [deliverable] = await ProjectDeliverable.create(
        [
          {
            projectId: project._id,
            title,
            category: project.projectType || "Website",
            description: project.projectDescription,
            sellingPrice: Number(project.totalAmount) || 0,
            expectedCompletion: project.expectedCompletionDate,
            actualCompletion: project.actualCompletionDate,
            status,
            progress: status === "Delivered" ? 100 : 0,
          },
        ],
        { session }
      );

      const legacyAssignments = normalizeAssignedFreelancers(project);
      for (const row of legacyAssignments) {
        const freelancerId = row.freelancerId?._id || row.freelancerId;
        if (!freelancerId) continue;
        const role = await inferRole(freelancerId, deliverable.category);
        await DeliverableAssignment.create(
          [
            {
              deliverableId: deliverable._id,
              freelancerId,
              role,
              cost: Number(row.outsourcingCost) || 0,
              amountPaid: Number(row.amountPaidToFreelancer) || 0,
              paymentStatus: row.freelancerPaymentStatus || "Pending",
            },
          ],
          { session }
        );
      }

      const advance = Number(project.advanceReceived) || 0;
      if (advance > 0) {
        const existingPayment = await ProjectPayment.countDocuments({ projectId: project._id }).session(
          session
        );
        if (!existingPayment) {
          await ProjectPayment.create(
            [
              {
                projectId: project._id,
                type: "Advance",
                amount: advance,
                paymentDate: project.advancePaymentDate || project.createdAt,
                method: "UPI",
                notes: "Migrated from legacy advance received",
                recordedBy: "migration",
              },
            ],
            { session }
          );
        }
      }

      if (!project.projectTitle?.trim()) {
        project.projectTitle =
          project.businessName?.trim() ||
          project.clientName?.trim() ||
          title;
      }

      await project.save({ session });
      await session.commitTransaction();
      migrated += 1;
    } catch (err) {
      await session.abortTransaction();
      console.error(`Failed to migrate project ${project._id}:`, err.message);
    } finally {
      session.endSession();
    }
  }

  console.log(`Projects migrated: ${migrated}`);
  console.log(`Projects skipped (already have deliverables): ${skipped}`);
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
