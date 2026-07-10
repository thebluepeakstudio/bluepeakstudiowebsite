const Service = require("../models/Service");
const ServicePayment = require("../models/ServicePayment");
const ApiError = require("../utils/ApiError");

const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const derivePaymentStatus = (totalPaid, total) => {
  const paid = roundMoney(totalPaid);
  const value = roundMoney(total);
  const remaining = Math.max(0, roundMoney(value - paid));

  if (value > 0 && remaining === 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
};

const recomputeServicePaymentSummary = async (serviceId, session = null) => {
  const queryOpts = session ? { session } : {};
  const service = await Service.findById(serviceId, null, queryOpts);
  if (!service) throw new ApiError(404, "Service not found");

  const payments = await ServicePayment.find({ serviceId })
    .sort({ paymentDate: 1 })
    .session(session || null)
    .lean();

  const total = roundMoney(service.totalPrice);
  const totalPaid = roundMoney(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));

  service.totalPrice = total;
  service.advanceReceived = totalPaid;
  service.remainingAmount = Math.max(0, roundMoney(total - totalPaid));
  service.paymentStatus = derivePaymentStatus(totalPaid, total);

  if (payments.length) {
    service.advancePaymentDate = payments[0].paymentDate;
    if (service.paymentStatus === "Paid") {
      service.fullPaymentDate = payments[payments.length - 1].paymentDate;
    } else {
      service.fullPaymentDate = undefined;
    }
  } else {
    service.advancePaymentDate = undefined;
    service.fullPaymentDate = undefined;
  }

  await service.save(queryOpts);
  return service;
};

const listPayments = async (serviceId) =>
  ServicePayment.find({ serviceId }).sort({ paymentDate: -1 }).lean();

const createPayment = async (serviceId, data, recordedBy, session = null) => {
  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new ApiError(400, "Payment amount must be greater than 0");

  const service = await Service.findById(serviceId).session(session || null);
  if (!service) throw new ApiError(404, "Service not found");

  const payment = await ServicePayment.create(
    [
      {
        serviceId,
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

  await recomputeServicePaymentSummary(serviceId, session);
  return payment[0];
};

const updatePayment = async (serviceId, paymentId, data, session = null) => {
  const payment = await ServicePayment.findOne({ _id: paymentId, serviceId }).session(
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
  await recomputeServicePaymentSummary(serviceId, session);
  return payment;
};

const deletePayment = async (serviceId, paymentId, session = null) => {
  const payment = await ServicePayment.findOne({ _id: paymentId, serviceId }).session(
    session || null
  );
  if (!payment) throw new ApiError(404, "Payment not found");
  await ServicePayment.deleteOne({ _id: paymentId }, session ? { session } : undefined);
  await recomputeServicePaymentSummary(serviceId, session);
  return payment;
};

module.exports = {
  roundMoney,
  derivePaymentStatus,
  recomputeServicePaymentSummary,
  recomputeProjectPaymentSummary: recomputeServicePaymentSummary,
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
};
