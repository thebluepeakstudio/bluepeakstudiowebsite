const roundMoney = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1);

const addYears = (date, count) => new Date(date.getFullYear() + count, date.getMonth(), 1);

const formatPeriodLabel = (date, frequency = "monthly") => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(date);
  if (frequency === "yearly") {
    return `${months[d.getMonth()]} ${d.getFullYear()}–${d.getFullYear() + 1}`;
  }
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const buildBillingDate = (year, month, billingDay) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(Math.max(1, billingDay), lastDay);
  return new Date(year, month, day, 23, 59, 59, 999);
};

const buildGenerationDate = (year, month, billingDay, leadDays) => {
  const billingDate = buildBillingDate(year, month, billingDay);
  const gen = new Date(billingDate);
  gen.setDate(gen.getDate() - Math.max(0, Number(leadDays) || 5));
  gen.setHours(0, 0, 0, 0);
  return gen;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const monthsFromStartToNow = (startDate) => {
  const start = startOfMonth(parseLocalDate(startDate));
  const end = startOfMonth(new Date());
  const months = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addMonths(cursor, 1)) {
    months.push(new Date(cursor));
  }
  return months;
};

/** Period keys from start through current period (monthly = each month; yearly = anniversary months). */
const periodsFromStartToNow = (startDate, frequency = "monthly") => {
  if (frequency !== "yearly") return monthsFromStartToNow(startDate);

  const start = parseLocalDate(startDate);
  if (!start) return [];
  const startPeriod = startOfMonth(start);
  const nowPeriod = startOfMonth(new Date());
  const periods = [];

  for (let year = start.getFullYear(); year <= nowPeriod.getFullYear() + 1; year += 1) {
    const period = new Date(year, start.getMonth(), 1);
    if (period < startPeriod) continue;
    if (period > nowPeriod) break;
    periods.push(period);
  }
  return periods;
};

const advancePeriod = (periodDate, frequency = "monthly") =>
  frequency === "yearly" ? addYears(periodDate, 1) : addMonths(periodDate, 1);

/**
 * Current billing period for a recurring config.
 * Monthly: this calendar month. Yearly: this year's anniversary month (or last year if not reached yet).
 */
const getCurrentPeriodForFrequency = (frequency = "monthly", startDate = null) => {
  const today = startOfMonth(startOfToday());
  if (frequency !== "yearly" || !startDate) return today;

  const start = parseLocalDate(startDate);
  if (!start) return today;

  let period = new Date(today.getFullYear(), start.getMonth(), 1);
  if (period > today) {
    period = new Date(today.getFullYear() - 1, start.getMonth(), 1);
  }
  const startPeriod = startOfMonth(start);
  if (period < startPeriod) return startPeriod;
  return period;
};

module.exports = {
  roundMoney,
  parseLocalDate,
  startOfMonth,
  endOfMonth,
  addMonths,
  addYears,
  formatPeriodLabel,
  buildBillingDate,
  buildGenerationDate,
  startOfToday,
  monthsFromStartToNow,
  periodsFromStartToNow,
  advancePeriod,
  getCurrentPeriodForFrequency,
};
