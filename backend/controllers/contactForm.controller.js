// controllers/contactForm.controller.js

const ContactForm = require("../models/contactform");
const Lead = require("../models/Lead");

module.exports.createContactForm = async (req, res) => {
  try {
    const { name, contactNo, email, message, projectType } = req.body;

    if (!name || !contactNo || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const resolvedProjectType = projectType || "Not sure yet";

    await ContactForm.create({
      name,
      contactNo,
      email,
      message,
      projectType: resolvedProjectType,
    });

    const existingLead = await Lead.findOne({
      email: email.trim().toLowerCase(),
      status: { $nin: ["Won", "Lost"] },
    });

    if (!existingLead) {
      await Lead.create({
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        phone: String(contactNo).trim(),
        leadSource: "Website",
        status: "New",
        priority: "Medium",
        notes: `Contact form message:\n${message.trim()}\n\nProject interest: ${resolvedProjectType}`,
      });
    }

    res.status(200).json({
      success: true,
      message: "Form submitted successfully",
    });
  } catch (err) {
    console.error("Error in Contact Form Controller:", err.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};
