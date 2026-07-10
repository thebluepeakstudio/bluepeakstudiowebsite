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

const formatPeriodLabel = (date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
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

module.exports = {
  roundMoney,
  parseLocalDate,
  startOfMonth,
  endOfMonth,
  addMonths,
  formatPeriodLabel,
  buildBillingDate,
  buildGenerationDate,
  startOfToday,
  monthsFromStartToNow,
};
