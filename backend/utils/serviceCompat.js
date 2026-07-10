/** Legacy API field aliases for Service documents (frontend transition). */
const withLegacyServiceFields = (doc) => {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return {
    ...plain,
    projectTitle: plain.name ?? plain.projectTitle,
    projectType: plain.category ?? plain.projectType,
    projectDescription: plain.description ?? plain.projectDescription,
    totalAmount: plain.totalPrice ?? plain.totalAmount,
  };
};

const normalizeServiceInput = (body = {}) => {
  const payload = { ...body };
  if (payload.projectTitle != null && payload.name == null) payload.name = payload.projectTitle;
  if (payload.projectType != null && payload.category == null) payload.category = payload.projectType;
  if (payload.projectDescription != null && payload.description == null) {
    payload.description = payload.projectDescription;
  }
  if (payload.totalAmount != null && payload.totalPrice == null) {
    payload.totalPrice = payload.totalAmount;
  }
  return payload;
};

module.exports = { withLegacyServiceFields, normalizeServiceInput };
