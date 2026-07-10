const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const {
  listBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../../services/brand.service");
const { getBrandDashboard, moveServiceToBrand } = require("../../services/brandDashboard.service");

const getBrands = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.status) filter.status = req.query.status;
  const data = await listBrands(filter);
  res.json({ success: true, data });
});

const getBrand = asyncHandler(async (req, res) => {
  const data = await getBrandById(req.params.id);
  res.json({ success: true, data });
});

const getBrandDashboardHandler = asyncHandler(async (req, res) => {
  const data = await getBrandDashboard(req.params.id);
  if (!data) throw new ApiError(404, "Brand not found");
  res.json({ success: true, data });
});

const postBrand = asyncHandler(async (req, res) => {
  const data = await createBrand(req.body);
  res.status(201).json({ success: true, data });
});

const putBrand = asyncHandler(async (req, res) => {
  const data = await updateBrand(req.params.id, req.body);
  res.json({ success: true, data });
});

const removeBrand = asyncHandler(async (req, res) => {
  await deleteBrand(req.params.id);
  res.json({ success: true, message: "Brand deleted" });
});

const moveService = asyncHandler(async (req, res) => {
  const data = await moveServiceToBrand(req.params.id, req.params.serviceId);
  res.json({ success: true, data });
});

module.exports = {
  getBrands,
  getBrand,
  getBrandDashboard: getBrandDashboardHandler,
  postBrand,
  putBrand,
  removeBrand,
  moveService,
};
