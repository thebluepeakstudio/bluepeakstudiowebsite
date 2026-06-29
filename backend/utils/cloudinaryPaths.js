const slugify = (value, fallback = "item") => {
  const slug = String(value || fallback)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
};

const buildClientFolder = (clientName) => `bluepeak/clients/${slugify(clientName, "client")}`;

const buildProjectDocumentFolder = (project) => {
  const client = project.clientId && typeof project.clientId === "object" ? project.clientId : null;

  const clientLabel =
    project.businessName?.trim() ||
    client?.companyName?.trim() ||
    project.clientName?.trim() ||
    client?.name?.trim() ||
    "client";

  const projectLabel = project.projectTitle?.trim() || "project";

  const clientSlug = slugify(clientLabel, "client");
  const projectSlug = slugify(projectLabel, "project");

  return `bluepeak/clients/${clientSlug}/${projectSlug}`;
};

const isPdfFile = (fileName, mimeType) =>
  mimeType === "application/pdf" || String(fileName || "").toLowerCase().endsWith(".pdf");

module.exports = {
  slugify,
  buildClientFolder,
  buildProjectDocumentFolder,
  isPdfFile,
};
