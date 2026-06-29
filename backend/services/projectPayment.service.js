const Project = require("../models/Project");
const ProjectPayment = require("../models/ProjectPayment");
const ApiError = require("../utils/ApiError");

const derivePaymentStatus = (totalPaid, total) => {
  const paid = Number(totalPaid) || 0;
  const value = Number(total) || 0;
  if (paid >= value && value > 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
};

const recomputeProjectPaymentSummary = async (projectId, session = null) => {
  const queryOpts = session ? { session } : {};
  const project = await Project.findById(projectId, null, queryOpts);
  if (!project) throw new ApiError(404, "Project not found");

  const payments = await ProjectPayment.find({ projectId })
    .sort({ paymentDate: 1 })
    .session(session || null)
    .lean();

  const total = Number(project.totalAmount) || 0;
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  project.advanceReceived = totalPaid;
  project.remainingAmount = Math.max(0, total - totalPaid);
  project.paymentStatus = derivePaymentStatus(totalPaid, total);

  if (payments.length) {
    project.advancePaymentDate = payments[0].paymentDate;
    if (project.paymentStatus === "Paid") {
      project.fullPaymentDate = payments[payments.length - 1].paymentDate;
    } else {
      project.fullPaymentDate = undefined;
    }
  } else {
    project.advancePaymentDate = undefined;
    project.fullPaymentDate = undefined;
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

const updatePayment = async (projectId, paymentId, data, session = null) => {
  const payment = await ProjectPayment.findOne({ _id: paymentId, projectId }).session(
    session || null
  );
  if (!payment) throw new ApiError(404, "Payment not found");

  if (data.amount !== undefined) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new ApiError(400, "Payment amount must be greater than 0");
    payment.amount = amount;
  }
  if (data.paymentDate !== undefined) payment.paymentDate = data.paymentDate;
  if (data.method !== undefined) payment.method = data.method;
  if (data.reference !== undefined) payment.reference = data.reference;
  if (data.notes !== undefined) payment.notes = data.notes;

  await payment.save(session ? { session } : undefined);
  await recomputeProjectPaymentSummary(projectId, session);
  return payment;
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
  derivePaymentStatus,
  recomputeProjectPaymentSummary,
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
};
