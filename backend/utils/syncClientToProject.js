const Client = require("../models/Client");
const Brand = require("../models/Brand");
const ApiError = require("./ApiError");

const syncClientToProject = async (body) => {
  if (!body.clientId) return body;

  const client = await Client.findById(body.clientId);
  if (!client) throw new ApiError(400, "Invalid client");

  const next = {
    ...body,
    clientName: client.name,
    email: client.email || body.email || "",
    contactNumber: client.phone || body.contactNumber || "",
  };

  // Prefer brand name over client company when a brand is linked
  if (!body.brandId) {
    next.businessName = client.companyName || body.businessName || "";
  }

  return next;
};

/** Apply brand name onto service name/businessName; validate brand belongs to client. */
const applyBrandToServiceBody = async (body) => {
  if (!body.brandId) return body;

  const brand = await Brand.findById(body.brandId);
  if (!brand) throw new ApiError(400, "Invalid brand");

  if (body.clientId && String(brand.clientId) !== String(body.clientId)) {
    throw new ApiError(400, "Brand does not belong to this client");
  }

  return {
    ...body,
    name: brand.name,
    businessName: brand.name,
  };
};

module.exports = { syncClientToProject, applyBrandToServiceBody };
