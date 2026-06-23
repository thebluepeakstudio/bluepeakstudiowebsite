const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const uniqueSlug = async (Model, baseSlug, excludeId = null, { softDelete = true } = {}) => {
  let slug = slugify(baseSlug) || "post";
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const filter = { slug: candidate };
    if (softDelete) filter.deletedAt = null;
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Model.findOne(filter).select("_id").lean();
    if (!exists) return candidate;
    suffix += 1;
  }
};

module.exports = { slugify, uniqueSlug };
