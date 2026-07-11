const mongoose = require("mongoose");

const EXPENSE_CATEGORIES = [
  "Salaries",
  "Freelancer Payments",
  "Software Subscriptions",
  "Ads & Marketing",
  "Domain & Hosting",
  "Office Expenses",
  "Internet & Utilities",
  "Decree",
  "Miscellaneous",
];
const PAID_VIA = ["UPI", "Bank", "Cash", "Card"];

const expenseSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    expenseDate: { type: Date, required: true, default: Date.now },
    paidVia: { type: String, enum: PAID_VIA, default: "UPI" },
    receiptUrl: { type: String },
    receiptPublicId: { type: String },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

expenseSchema.index({ projectId: 1, expenseDate: -1 });
expenseSchema.index({ serviceId: 1, expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ title: "text" });

module.exports = mongoose.model("Expense", expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.PAID_VIA = PAID_VIA;
