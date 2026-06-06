export const PROJECT_TYPES = [
  "Website",
  "Graphic Design",
  "SMM",
  "SEO",
  "Branding",
  "Video Editing",
];

export const PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];
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
  if (project.businessName) return `${project.clientName} — ${project.businessName}`;
  return project.clientName || project.projectTitle || "Untitled";
};
