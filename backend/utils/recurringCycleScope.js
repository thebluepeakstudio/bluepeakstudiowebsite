const BillingCycle = require("../models/BillingCycle");
const ApiError = require("./ApiError");
const { startOfMonth, startOfToday } = require("./recurringDates");

const APPLY_SCOPES = ["future_only", "current_and_future"];
const DEFAULT_APPLY_SCOPE = "future_only";

const normalizeApplyScope = (scope) => {
  const value = String(scope || DEFAULT_APPLY_SCOPE).trim();
  if (!APPLY_SCOPES.includes(value)) return DEFAULT_APPLY_SCOPE;
  return value;
};

const getCurrentPeriodMonth = () => startOfMonth(startOfToday());

const periodMonthKey = (date) => {
  const d = startOfMonth(new Date(date));
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const isHistoricalCycle = (cycle, currentPeriod = getCurrentPeriodMonth()) => {
  if (!cycle?.periodMonth) return false;
  return startOfMonth(new Date(cycle.periodMonth)) < startOfMonth(currentPeriod);
};

const isCurrentCycle = (cycle, currentPeriod = getCurrentPeriodMonth()) => {
  if (!cycle?.periodMonth) return false;
  return periodMonthKey(cycle.periodMonth) === periodMonthKey(currentPeriod);
};

const annotateCycleScope = (cycle, currentPeriod = getCurrentPeriodMonth()) => ({
  isHistorical: isHistoricalCycle(cycle, currentPeriod),
  isCurrent: isCurrentCycle(cycle, currentPeriod),
});

const getCurrentBillingCycle = async (serviceId, currentPeriod = getCurrentPeriodMonth()) =>
  BillingCycle.findOne({
    serviceId,
    periodMonth: currentPeriod,
  }).lean();

const assertNotHistoricalCycle = (cycle) => {
  if (cycle && isHistoricalCycle(cycle)) {
    throw new ApiError(400, "Historical billing cycles cannot be modified");
  }
};

module.exports = {
  APPLY_SCOPES,
  DEFAULT_APPLY_SCOPE,
  normalizeApplyScope,
  getCurrentPeriodMonth,
  periodMonthKey,
  isHistoricalCycle,
  isCurrentCycle,
  annotateCycleScope,
  getCurrentBillingCycle,
  assertNotHistoricalCycle,
};
