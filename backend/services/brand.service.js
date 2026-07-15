const Brand = require("../models/Brand");
const Service = require("../models/Service");
const ApiError = require("../utils/ApiError");

const listBrands = async (filter = {}) => {
  return Brand.find(filter).sort({ name: 1 }).lean();
};

const getBrandById = async (brandId) => {
  const brand = await Brand.findById(brandId).lean();
  if (!brand) throw new ApiError(404, "Brand not found");
  return brand;
};

const createBrand = async (data) => {
  if (!data.clientId) throw new ApiError(400, "Client is required");
  if (!data.name?.trim()) throw new ApiError(400, "Brand name is required");

  if (data.isDefault) {
    await Brand.updateMany({ clientId: data.clientId }, { isDefault: false });
  }

  const brand = await Brand.create({
    clientId: data.clientId,
    name: data.name.trim(),
    logoUrl: data.logoUrl || "",
    logoPublicId: data.logoPublicId || "",
    industry: data.industry || "",
    address: data.address || "",
    description: data.description || "",
    status: data.status || "Active",
    notes: data.notes || "",
    isDefault: Boolean(data.isDefault),
  });

  return brand.toObject();
};

const syncLinkedServiceNames = async (brandId, brandName) => {
  await Service.updateMany(
    { brandId },
    {
      $set: {
        name: brandName,
        businessName: brandName,
      },
    }
  );
};

const updateBrand = async (brandId, updates) => {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(404, "Brand not found");

  const previousName = brand.name;
  const fields = [
    "name",
    "logoUrl",
    "logoPublicId",
    "industry",
    "address",
    "description",
    "status",
    "notes",
    "isDefault",
  ];

  fields.forEach((key) => {
    if (updates[key] === undefined) return;
    if (key === "name") {
      const name = String(updates.name).trim();
      if (!name) throw new ApiError(400, "Brand name is required");
      brand.name = name;
      return;
    }
    if (key === "address") {
      brand.address = String(updates.address || "").trim();
      return;
    }
    brand[key] = updates[key];
  });

  if (updates.isDefault) {
    await Brand.updateMany(
      { clientId: brand.clientId, _id: { $ne: brand._id } },
      { isDefault: false }
    );
  }

  await brand.save();

  if (brand.name !== previousName) {
    await syncLinkedServiceNames(brand._id, brand.name);
  }

  return brand.toObject();
};

const deleteBrand = async (brandId) => {
  const brand = await Brand.findById(brandId);
  if (!brand) throw new ApiError(404, "Brand not found");

  const linkedServices = await Service.countDocuments({ brandId });
  if (linkedServices > 0) {
    throw new ApiError(400, "Cannot delete brand with linked services");
  }

  await Brand.findByIdAndDelete(brandId);
  return brand.toObject();
};

module.exports = {
  listBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  syncLinkedServiceNames,
};
