export const SERVICE_CATEGORIES = [
  "Website",
  "Graphic Design",
  "SMM",
  "SEO",
  "Branding",
  "Video Editing",
  "Software",
];

export const PROJECT_TYPES = SERVICE_CATEGORIES;

export const DELIVERABLE_AMOUNT_LABEL = "Amount (₹)";

export const DELIVERABLE_STATUSES = [
  "Not Started",
  "In Progress",
  "Waiting For Client",
  "Review",
  "Delivered",
  "Cancelled",
];

export const PAYMENT_STATUSES = ["Unpaid", "Partial", "Paid"];

/** Legacy DB value — display as Unpaid */
export const normalizePaymentStatus = (status) => (status === "Pending" ? "Unpaid" : status);
export const WORK_STATUSES = [
  "Not Started",
  "In Progress",
  "Waiting for Client",
  "Revision",
  "Completed",
  "Delivered",
];
export const FREELANCER_PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];

export const EXPENSE_CATEGORIES = [
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

export const PAID_VIA = ["UPI", "Bank", "Cash", "Card"];

export const BILLING_MODELS = ["one_time", "recurring"];

export const RECURRING_STATUSES = ["active", "paused", "cancelled"];

/** Map internal recurring invoice status to display label */
export const formatInvoiceStatus = (status) => {
  if (status === "partial") return "Partially Paid";
  if (status === "paid") return "Paid";
  if (status === "cancelled") return "Cancelled";
  if (["due", "upcoming", "overdue"].includes(status)) return "Pending";
  return status || "Pending";
};

export const getInvoiceOpenAmount = (invoice) => {
  if (!invoice) return 0;
  const due = Number(invoice.amountDue) || 0;
  const paid = Number(invoice.amountPaid) || 0;
  const credit = Number(invoice.creditApplied) || 0;
  return Math.max(0, due - paid - credit);
};

export const DOCUMENT_CATEGORIES = [
  "Onboarding Documents",
  "Contracts",
  "Payment Plans",
  "Invoices",
  "Brand Assets",
  "Offboarding Documents",
  "Deliverables",
  "Other Attachments",
];

export const AVAILABILITY = ["Available", "Busy", "Unavailable"];

export const CLIENT_STATUSES = ["Active", "Inactive"];

export const BRAND_STATUSES = ["Active", "Inactive"];

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "On Hold",
];

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Outreach",
  "Ads",
  "Event",
  "Other",
];

export const LEAD_PRIORITIES = ["Low", "Medium", "High"];

export const LEAD_REQUIREMENTS = [
  "Website",
  "Marketing",
  "Designing",
  "Software",
  "SEO",
  "SMM",
  "Branding",
  "Video Editing",
];

export const FOLLOW_UP_STATUSES = ["Scheduled", "Completed", "Missed", "Cancelled"];

export const ACTIVITY_TYPES = ["call", "meeting", "email", "note", "task"];

/** Display label for a project (no title required). */
export const getProjectLabel = (project) => {
  if (!project) return "—";
  if (project.brandId?.name) return project.brandId.name;
  if (project.projectTitle?.trim()) return project.projectTitle;
  if (project.projectName?.trim()) return project.projectName;
  if (project.businessName) return `${project.clientName} — ${project.businessName}`;
  return project.clientName || "Untitled";
};
