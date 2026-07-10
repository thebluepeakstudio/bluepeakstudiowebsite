const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const {
  getBrands,
  getBrand,
  getBrandDashboard,
  postBrand,
  putBrand,
  removeBrand,
  moveService,
} = require("../../controllers/admin/brand.controller");

const router = express.Router();
router.use(protect);

router.get("/", getBrands);
router.post("/", postBrand);
router.get("/:id/dashboard", getBrandDashboard);
router.post("/:id/services/:serviceId/move", moveService);
router.get("/:id", getBrand);
router.put("/:id", putBrand);
router.delete("/:id", removeBrand);

module.exports = router;
