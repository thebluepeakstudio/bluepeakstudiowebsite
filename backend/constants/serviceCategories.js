const SERVICE_CATEGORIES = [
  "Website",
  "Graphic Design",
  "SMM",
  "SEO",
  "Branding",
  "Video Editing",
  "Software",
  "Maintenance",
  "Domain",
  "Hosting",
];

const DELIVERABLE_STATUSES = [
  "Not Started",
  "In Progress",
  "Waiting For Client",
  "Review",
  "Delivered",
  "Cancelled",
];

const PAID_VIA = ["UPI", "Bank", "Cash", "Card"];

const FREELANCER_PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];

const PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid", "Pending"];

const WORK_STATUSES = [
  "Not Started",
  "In Progress",
  "Waiting for Client",
  "Revision",
  "Completed",
  "Delivered",
];

const BILLING_MODELS = ["one_time", "recurring"];

const BILLING_FREQUENCIES = ["monthly", "yearly"];

const RECURRING_STATUSES = ["active", "paused", "cancelled"];

const BILLING_CYCLE_PHASES = ["upcoming", "due", "closed"];

const CYCLE_INVOICE_STATUSES = [
  "upcoming",
  "due",
  "partial",
  "overdue",
  "paid",
  "cancelled",
];

const CYCLE_FREELANCER_DUE_STATUSES = ["upcoming", "due", "partial", "paid", "cancelled"];

const PAYMENT_ALLOCATION_TARGETS = [
  "one_time_service",
  "cycle_invoice",
  "recurring_wallet",
];

const WALLET_TRANSACTION_TYPES = ["credit_add", "auto_apply", "manual_adjust"];

const FREELANCER_DUE_STATUSES = ["pending", "partial", "paid", "cancelled"];

const DELIVERABLE_DUE_TRIGGER_STATUSES = [
  "In Progress",
  "Waiting For Client",
  "Review",
  "Delivered",
];

const BRAND_STATUSES = ["Active", "Inactive"];

module.exports = {
  SERVICE_CATEGORIES,
  DELIVERABLE_STATUSES,
  PAID_VIA,
  FREELANCER_PAYMENT_STATUSES,
  PAYMENT_STATUSES,
  WORK_STATUSES,
  BILLING_MODELS,
  BILLING_FREQUENCIES,
  RECURRING_STATUSES,
  BILLING_CYCLE_PHASES,
  CYCLE_INVOICE_STATUSES,
  CYCLE_FREELANCER_DUE_STATUSES,
  PAYMENT_ALLOCATION_TARGETS,
  WALLET_TRANSACTION_TYPES,
  FREELANCER_DUE_STATUSES,
  DELIVERABLE_DUE_TRIGGER_STATUSES,
  BRAND_STATUSES,
};
