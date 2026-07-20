const WebsiteTestimonial = require("../models/WebsiteTestimonial");
const WebsiteProject = require("../models/WebsiteProject");
const WebsiteProjectCategory = require("../models/WebsiteProjectCategory");
const TestimonialForm = require("../models/testimonialForm");
const { slugify } = require("./slugify");

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

const DEFAULT_CATEGORIES = [
  "Custom Software",
  "Web App",
  "E-Commerce",
  "Real Estate",
  "Landing Page",
  "Manufacturing",
];

/**
 * Soft-delete demo seed content, sync form testimonials, seed default categories.
 */
async function ensureWebsiteContentSeed() {
  const now = new Date();

  const [testimonials, projects] = await Promise.all([
    WebsiteTestimonial.updateMany(
      { name: { $in: SEEDED_TESTIMONIAL_NAMES }, deletedAt: null, source: { $ne: "form" } },
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
  }

  const synced = await syncFormTestimonialsToCrm();
  if (synced > 0) {
    console.log(`[website-seed] Synced ${synced} form testimonial(s) into CRM`);
  }

  const categoriesSeeded = await seedDefaultCategories();
  if (categoriesSeeded > 0) {
    console.log(`[website-seed] Seeded ${categoriesSeeded} portfolio categor(y/ies)`);
  } else if (removed === 0 && synced === 0) {
    console.log("[website-seed] Website content up to date");
  }

  return {
    testimonialsCleared: testimonials.modifiedCount || 0,
    projectsCleared: projects.modifiedCount || 0,
    formSynced: synced,
    categoriesSeeded,
  };
}

async function seedDefaultCategories() {
  let created = 0;
  for (const name of DEFAULT_CATEGORIES) {
    const exists = await WebsiteProjectCategory.findOne({
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    })
      .select("_id")
      .lean();
    if (exists) continue;
    await WebsiteProjectCategory.create({ name, slug: slugify(name) });
    created += 1;
  }
  return created;
}

async function syncFormTestimonialsToCrm() {
  const forms = await TestimonialForm.find({}).sort({ createdAt: 1 }).lean();
  if (!forms.length) return 0;

  let created = 0;
  let sortOrder =
    (
      await WebsiteTestimonial.findOne({ deletedAt: null })
        .sort({ sortOrder: -1 })
        .select("sortOrder")
        .lean()
    )?.sortOrder ?? -1;

  for (const form of forms) {
    const name = String(form.name || "").trim();
    const text = String(form.message || "").trim();
    if (!name || !text) continue;

    const existing = await WebsiteTestimonial.findOne({
      deletedAt: null,
      $or: [
        { formSubmissionId: form._id },
        { source: "form", name, text },
      ],
    })
      .select("_id")
      .lean();

    if (existing) continue;

    sortOrder += 1;
    await WebsiteTestimonial.create({
      name,
      text,
      img: "",
      rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
      sortOrder,
      status: "Draft",
      source: "form",
      formSubmissionId: form._id,
    });
    created += 1;
  }

  return created;
}

module.exports = ensureWebsiteContentSeed;
module.exports.syncFormTestimonialsToCrm = syncFormTestimonialsToCrm;
