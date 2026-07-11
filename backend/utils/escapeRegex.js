function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Safe case-insensitive regex for user search input (max 100 chars). */
function toSafeRegex(value, { maxLength = 100 } = {}) {
  const trimmed = String(value || "").trim().slice(0, maxLength);
  if (!trimmed) return null;
  return { $regex: escapeRegex(trimmed), $options: "i" };
}

module.exports = { escapeRegex, toSafeRegex };
