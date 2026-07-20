export const WEBSITE_STATUSES = ["Draft", "Published"];

export const PROJECT_SIZES = ["large", "small"];

export const PROJECT_CATEGORIES = [
  "Custom Software",
  "Web App",
  "E-Commerce",
  "Real Estate",
  "Landing Page",
  "Manufacturing",
];

export const emptyTestimonial = {
  name: "",
  text: "",
  img: "",
  rating: 5,
  sortOrder: 0,
  status: "Draft",
};

export const emptyWebsiteProject = {
  title: "",
  slug: "",
  category: "Custom Software",
  desc: "",
  tags: "",
  color: "#378ADD",
  img: "",
  link: "",
  size: "large",
  sortOrder: 0,
  status: "Published",
  caseStudy: {
    overview: "",
    problem: "",
    solution: "",
    highlights: "",
  },
};

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hasCaseStudyContent(caseStudy) {
  if (!caseStudy) return false;
  return Boolean(
    caseStudy.overview?.trim() ||
      caseStudy.problem?.trim() ||
      caseStudy.solution?.trim() ||
      (Array.isArray(caseStudy.highlights)
        ? caseStudy.highlights.length
        : String(caseStudy.highlights || "").trim())
  );
}
