const Project = require("../models/Project");
const ProjectPayment = require("../models/ProjectPayment");
const ApiError = require("../utils/ApiError");

const recomputeProjectPaymentSummary = async (projectId, session = null) => {
  const queryOpts = session ? { session } : {};
  const project = await Project.findById(projectId, null, queryOpts);
  if (!project) throw new ApiError(404, "Project not found");

  const payments = await ProjectPayment.find({ projectId })
    .sort({ paymentDate: 1 })
    .session(session || null)
    .lean();

  if (payments.length) {
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    project.advanceReceived = totalPaid;
    const total = Number(project.totalAmount) || 0;
    if (totalPaid >= total && total > 0) {
      project.paymentStatus = "Paid";
      project.remainingAmount = 0;
      project.fullPaymentDate = payments[payments.length - 1].paymentDate;
    } else if (totalPaid > 0) {
      project.paymentStatus = "Partial";
      project.remainingAmount = Math.max(0, total - totalPaid);
    } else {
      project.paymentStatus = "Pending";
      project.remainingAmount = total;
    }
    project.advancePaymentDate = payments[0].paymentDate;
  } else if (project.paymentStatus !== "Paid") {
    const total = Number(project.totalAmount) || 0;
    const advance = Number(project.advanceReceived) || 0;
    project.remainingAmount = Math.max(0, total - advance);
  }

  await project.save(queryOpts);
  return project;
};

const listPayments = async (projectId) =>
  ProjectPayment.find({ projectId }).sort({ paymentDate: -1 }).lean();

const createPayment = async (projectId, data, recordedBy, session = null) => {
  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new ApiError(400, "Payment amount must be greater than 0");

  const project = await Project.findById(projectId).session(session || null);
  if (!project) throw new ApiError(404, "Project not found");

  const payment = await ProjectPayment.create(
    [
      {
        projectId,
        type: data.type,
        amount,
        paymentDate: data.paymentDate || new Date(),
        method: data.method || "UPI",
        reference: data.reference,
        notes: data.notes,
        recordedBy,
      },
    ],
    session ? { session } : undefined
  );

  await recomputeProjectPaymentSummary(projectId, session);
  return payment[0];
};

const deletePayment = async (projectId, paymentId, session = null) => {
  const payment = await ProjectPayment.findOne({ _id: paymentId, projectId }).session(
    session || null
  );
  if (!payment) throw new ApiError(404, "Payment not found");
  await ProjectPayment.deleteOne({ _id: paymentId }, session ? { session } : undefined);
  await recomputeProjectPaymentSummary(projectId, session);
  return payment;
};

module.exports = {
  recomputeProjectPaymentSummary,
  listPayments,
  createPayment,
  deletePayment,
};
