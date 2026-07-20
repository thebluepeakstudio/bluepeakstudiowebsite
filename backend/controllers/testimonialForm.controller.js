const TestimonialForm = require("../models/testimonialForm");
const WebsiteTestimonial = require("../models/WebsiteTestimonial");
const Client = require("../models/Client");
const Brand = require("../models/Brand");

async function upsertCrmTestimonialFromForm(formDoc) {
  const trimmedName = String(formDoc.name || "").trim();
  const trimmedText = String(formDoc.message || "").trim();
  if (!trimmedName || !trimmedText) return null;

  const existing = await WebsiteTestimonial.findOne({
    deletedAt: null,
    $or: [
      { formSubmissionId: formDoc._id },
      { source: "form", name: trimmedName, text: trimmedText },
    ],
  });

  if (existing) {
    existing.name = trimmedName;
    existing.text = trimmedText;
    existing.rating = Math.min(5, Math.max(1, Number(formDoc.rating) || 5));
    existing.formSubmissionId = formDoc._id;
    existing.source = "form";
    await existing.save();
    return existing;
  }

  const maxOrder = await WebsiteTestimonial.findOne({ deletedAt: null })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();

  return WebsiteTestimonial.create({
    name: trimmedName,
    text: trimmedText,
    img: "",
    rating: Math.min(5, Math.max(1, Number(formDoc.rating) || 5)),
    sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    status: "Draft",
    source: "form",
    formSubmissionId: formDoc._id,
  });
}

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

    const formDoc = await TestimonialForm.create({
      name,
      rating,
      message,
      clientId: resolvedClientId,
      brandId: resolvedBrandId,
    });

    try {
      await upsertCrmTestimonialFromForm(formDoc);
    } catch (crmErr) {
      // Form is saved; CRM sync on next boot will pick it up
      console.error("[testimonial] CRM upsert failed:", crmErr.message);
    }

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

module.exports.upsertCrmTestimonialFromForm = upsertCrmTestimonialFromForm;
