export const adminQueryKeys = {
  clients: (params) => ["admin", "clients", params],
  projects: (params) => ["admin", "projects", params],
  freelancers: (params) => ["admin", "freelancers", params],
  expenses: (params) => ["admin", "expenses", params],
  expenseSummary: (params) => ["admin", "expense-summary", params],
  blogs: (params) => ["admin", "blogs", params],
  blogCategories: () => ["admin", "blog-categories"],
  websiteTestimonials: (params) => ["admin", "website-testimonials", params],
  websiteProjects: (params) => ["admin", "website-projects", params],
  websiteProjectCategories: () => ["admin", "website-project-categories"],
  dashboard: () => ["admin", "dashboard"],
  profitLoss: () => ["admin", "profit-loss"],
};
