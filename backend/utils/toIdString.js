/** Normalize MongoDB / populated refs to a stable string id. */
function toIdString(value) {
  if (value == null) return "";
  if (typeof value === "object" && value._id != null) return String(value._id);
  return String(value);
}

module.exports = { toIdString };
