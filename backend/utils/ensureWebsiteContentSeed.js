const WebsiteTestimonial = require("../models/WebsiteTestimonial");
const WebsiteProject = require("../models/WebsiteProject");

/** Names/slugs that were auto-inserted by the old seed — remove so CRM is the only source. */
const SEEDED_TESTIMONIAL_NAMES = [
  "Chikoo Constructions Ltd",
  "Tvastih Studio",
  "Zolo Media",
  "Mr Lazy Tech",
];

const SEEDED_PROJECT_SLUGS = [
  "client-management-system",
  "inventory-management-system",
  "foxnut-manufacturing-erp",
  "chikoo-constructions",
  "wanderlust",
  "tvastih-studio",
  "mr-corrugators",
];

/**
 * Soft-delete auto-seeded website content once. Does not insert anything.
 * After this, homepage / projects only show what you add in CRM.
 */
async function ensureWebsiteContentSeed() {
  const now = new Date();

  const [testimonials, projects] = await Promise.all([
    WebsiteTestimonial.updateMany(
      { name: { $in: SEEDED_TESTIMONIAL_NAMES }, deletedAt: null },
      { $set: { deletedAt: now, status: "Draft" } }
    ),
    WebsiteProject.updateMany(
      { slug: { $in: SEEDED_PROJECT_SLUGS }, deletedAt: null },
      { $set: { deletedAt: now, status: "Draft" } }
    ),
  ]);

  const removed = (testimonials.modifiedCount || 0) + (projects.modifiedCount || 0);
  if (removed > 0) {
    console.log(
      `[website-seed] Cleared auto-seeded content (${testimonials.modifiedCount} testimonials, ${projects.modifiedCount} projects)`
    );
  } else {
    console.log("[website-seed] No auto-seeded content to clear");
  }

  return {
    testimonialsCleared: testimonials.modifiedCount || 0,
    projectsCleared: projects.modifiedCount || 0,
  };
}

module.exports = ensureWebsiteContentSeed;
