const {
  computeFreelancerPaymentStatus,
  syncProjectFreelancerPaymentFields,
} = require("./projectFreelancerPayment");

const freelancerIdStr = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id.toString();
  return value.toString();
};

const getAssignmentFreelancerIds = (project) => {
  if (project.assignedFreelancers?.length) {
    return project.assignedFreelancers
      .map((a) => freelancerIdStr(a.freelancerId))
      .filter(Boolean);
  }
  const legacy = freelancerIdStr(project.freelancerId);
  return legacy ? [legacy] : [];
};

const getTotalOutsourcingCost = (project) => {
  if (project.assignedFreelancers?.length) {
    return project.assignedFreelancers.reduce(
      (sum, a) => sum + (Number(a.outsourcingCost) || 0),
      0
    );
  }
  return Number(project.outsourcingCost) || 0;
};

const normalizeAssignedFreelancers = (project) => {
  if (project.assignedFreelancers?.length) {
    return project.assignedFreelancers.map((a) => ({
      _id: a._id,
      freelancerId: a.freelancerId,
      outsourcingCost: Number(a.outsourcingCost) || 0,
      amountPaidToFreelancer: Number(a.amountPaidToFreelancer) || 0,
      freelancerPaymentStatus: a.freelancerPaymentStatus || "Pending",
    }));
  }
  if (project.freelancerId) {
    return [
      {
        freelancerId: project.freelancerId,
        outsourcingCost: Number(project.outsourcingCost) || 0,
        amountPaidToFreelancer: Number(project.amountPaidToFreelancer) || 0,
        freelancerPaymentStatus: project.freelancerPaymentStatus || "Pending",
      },
    ];
  }
  return [];
};

const syncAssignmentPaymentFields = (assignment) => {
  const cost = Number(assignment.outsourcingCost) || 0;
  let paid = Number(assignment.amountPaidToFreelancer) || 0;
  if (paid > cost) paid = cost;
  assignment.amountPaidToFreelancer = paid;
  assignment.freelancerPaymentStatus = computeFreelancerPaymentStatus(cost, paid);
  return assignment;
};

const mergeAssignedFreelancers = (existing = {}, incoming = []) => {
  const prev = normalizeAssignedFreelancers(existing);
  const prevByFreelancer = Object.fromEntries(
    prev.map((a) => [freelancerIdStr(a.freelancerId), a])
  );

  const seen = new Set();
  const merged = [];

  for (const row of incoming) {
    const id = freelancerIdStr(row.freelancerId);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const prevRow = prevByFreelancer[id];
    const cost = Math.max(0, Number(row.outsourcingCost) || 0);
    let paid = prevRow ? Number(prevRow.amountPaidToFreelancer) || 0 : 0;
    const freelancerChanged = !prevRow;
    const wasNotOutsourced = !existing.isOutsourced;

    if (freelancerChanged || wasNotOutsourced) {
      paid = 0;
    } else if (paid > cost) {
      paid = cost;
    }

    merged.push(
      syncAssignmentPaymentFields({
        _id: prevRow?._id,
        freelancerId: row.freelancerId,
        outsourcingCost: cost,
        amountPaidToFreelancer: paid,
      })
    );
  }

  return merged;
};

const applyFreelancerFieldsToProject = (project) => {
  if (!project.isOutsourced || !project.assignedFreelancers?.length) {
    project.assignedFreelancers = [];
    project.freelancerId = undefined;
    project.freelancerAssigned = undefined;
    project.outsourcingCost = 0;
    project.amountPaidToFreelancer = 0;
    project.freelancerPaymentStatus = "Pending";
    return project;
  }

  project.assignedFreelancers = project.assignedFreelancers.map(syncAssignmentPaymentFields);
  const first = project.assignedFreelancers[0];
  project.freelancerId = first.freelancerId;
  project.outsourcingCost = getTotalOutsourcingCost(project);
  project.amountPaidToFreelancer = project.assignedFreelancers.reduce(
    (sum, a) => sum + (Number(a.amountPaidToFreelancer) || 0),
    0
  );
  project.freelancerPaymentStatus = computeFreelancerPaymentStatus(
    project.outsourcingCost,
    project.amountPaidToFreelancer
  );
  syncProjectFreelancerPaymentFields(project);
  return project;
};

const findAssignmentForFreelancer = (project, freelancerId) => {
  const id = freelancerIdStr(freelancerId);
  const assignments = normalizeAssignedFreelancers(project);
  return assignments.find((a) => freelancerIdStr(a.freelancerId) === id);
};

const applyPaymentToAssignment = (project, freelancerId, amount) => {
  const id = freelancerIdStr(freelancerId);
  if (!project.assignedFreelancers?.length) {
    if (freelancerIdStr(project.freelancerId) === id) {
      project.amountPaidToFreelancer = (Number(project.amountPaidToFreelancer) || 0) + amount;
      syncProjectFreelancerPaymentFields(project);
    }
    return project;
  }

  project.assignedFreelancers = project.assignedFreelancers.map((a) => {
    if (freelancerIdStr(a.freelancerId) !== id) return a;
    const next = {
      ...a,
      amountPaidToFreelancer: (Number(a.amountPaidToFreelancer) || 0) + amount,
    };
    return syncAssignmentPaymentFields(next);
  });
  applyFreelancerFieldsToProject(project);
  return project;
};

module.exports = {
  freelancerIdStr,
  getAssignmentFreelancerIds,
  getTotalOutsourcingCost,
  normalizeAssignedFreelancers,
  mergeAssignedFreelancers,
  applyFreelancerFieldsToProject,
  findAssignmentForFreelancer,
  applyPaymentToAssignment,
  syncAssignmentPaymentFields,
};
