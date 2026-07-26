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
