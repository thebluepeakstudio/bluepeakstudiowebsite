export const adminQueryKeys = {
  clients: (params) => ["admin", "clients", params],
  projects: (params) => ["admin", "projects", params],
  freelancers: (params) => ["admin", "freelancers", params],
  expenses: (params) => ["admin", "expenses", params],
  expenseSummary: (params) => ["admin", "expense-summary", params],
  blogs: (params) => ["admin", "blogs", params],
  blogCategories: () => ["admin", "blog-categories"],
  dashboard: () => ["admin", "dashboard"],
  profitLoss: () => ["admin", "profit-loss"],
};
