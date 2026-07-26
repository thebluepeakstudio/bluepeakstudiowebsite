const Expense = require("../../models/Expense");
const Service = require("../../models/Service");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../../utils/uploadToCloudinary");
const { invalidateAnalyticsCache } = require("./analytics.controller");
const { toSafeRegex } = require("../../utils/escapeRegex");

const buildFilter = (query) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.paidVia) filter.paidVia = query.paidVia;
  if (query.search) {
    const pattern = toSafeRegex(query.search);
    if (pattern) filter.title = pattern;
  }
  if (query.startDate || query.endDate) {
    filter.expenseDate = {};
    if (query.startDate) filter.expenseDate.$gte = new Date(query.startDate);
    if (query.endDate) filter.expenseDate.$lte = new Date(query.endDate);
  }
  if (query.month && query.year) {
    const start = new Date(query.year, query.month - 1, 1);
    const end = new Date(query.year, query.month, 0, 23, 59, 59);
    filter.expenseDate = { $gte: start, $lte: end };
  }
  return filter;
};

const getExpenses = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(req.query);

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .select("title amount category expenseDate paidVia notes createdAt")
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: expenses,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getExpenseSummary = asyncHandler(async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [monthlyAgg, byCategory, allTimeAgg] = await Promise.all([
    Expense.aggregate([
      { $match: { expenseDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { expenseDate: { $gte: start, $lte: end } } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      month,
      year,
      total: monthlyAgg[0]?.total || 0,
      count: monthlyAgg[0]?.count || 0,
      allTimeTotal: allTimeAgg[0]?.total || 0,
      allTimeCount: allTimeAgg[0]?.count || 0,
      byCategory,
    },
  });
});

const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, "Expense not found");
  res.json({ success: true, data: expense });
});

const createExpense = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.projectId && !body.serviceId) {
    const service = await Service.findById(body.projectId).select("_id").lean();
    if (service) body.serviceId = service._id;
  }
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "bluepeak/receipts");
    body.receiptUrl = result.secure_url;
    body.receiptPublicId = result.public_id;
  }
  const expense = await Expense.create(body);
  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: expense });
});

const updateExpense = asyncHandler(async (req, res) => {
  const existing = await Expense.findById(req.params.id);
  if (!existing) throw new ApiError(404, "Expense not found");

  const body = { ...req.body };
  if (req.file) {
    if (existing.receiptPublicId) await deleteFromCloudinary(existing.receiptPublicId);
    const result = await uploadToCloudinary(req.file.buffer, "bluepeak/receipts");
    body.receiptUrl = result.secure_url;
    body.receiptPublicId = result.public_id;
  }

  const expense = await Expense.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });

  invalidateAnalyticsCache();
  res.json({ success: true, data: expense });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, "Expense not found");

  if (expense.receiptPublicId) await deleteFromCloudinary(expense.receiptPublicId);
  await Expense.findByIdAndDelete(req.params.id);

  invalidateAnalyticsCache();
  res.json({ success: true, message: "Expense deleted" });
});

module.exports = {
  getExpenses,
  getExpense,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
};
