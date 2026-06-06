const FREELANCER_PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];

const computeFreelancerPaymentStatus = (outsourcingCost, amountPaid) => {
  const cost = Number(outsourcingCost) || 0;
  const paid = Number(amountPaid) || 0;
  if (cost <= 0) return paid > 0 ? "Paid" : "Pending";
  if (paid >= cost) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
};

const getProjectFreelancerDue = (outsourcingCost, amountPaid) =>
  Math.max(0, (Number(outsourcingCost) || 0) - (Number(amountPaid) || 0));

const syncProjectFreelancerPaymentFields = (project) => {
  const cost = project.outsourcingCost || 0;
  let paid = project.amountPaidToFreelancer || 0;
  if (paid > cost) paid = cost;
  project.amountPaidToFreelancer = paid;
  project.freelancerPaymentStatus = computeFreelancerPaymentStatus(cost, paid);
  return project;
};

module.exports = {
  FREELANCER_PAYMENT_STATUSES,
  computeFreelancerPaymentStatus,
  getProjectFreelancerDue,
  syncProjectFreelancerPaymentFields,
};
