const TestimonialForm = require("../models/testimonialForm");
const Client = require("../models/Client");
const Brand = require("../models/Brand");

module.exports.createTestimonial = async (req, res) => {
  try {
    const { name, rating, message, clientId, brandId } = req.body;

    if (!name || !message || !rating) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    let resolvedClientId = null;
    let resolvedBrandId = null;

    if (clientId) {
      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Invalid client reference",
        });
      }
      resolvedClientId = client._id;

      if (brandId) {
        const brand = await Brand.findOne({ _id: brandId, clientId: client._id });
        if (!brand) {
          return res.status(400).json({
            success: false,
            message: "Invalid brand reference for this client",
          });
        }
        resolvedBrandId = brand._id;
      }
    }

    await TestimonialForm.create({
      name,
      rating,
      message,
      clientId: resolvedClientId,
      brandId: resolvedBrandId,
    });

    res.status(200).json({
      success: true,
      message: "Testimonial submitted successfully",
    });
  } catch (err) {
    console.error("Error in Testimonial Form Controller:", err.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};
