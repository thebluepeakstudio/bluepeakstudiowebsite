// controllers/contactForm.controller.js

const ContactForm = require("../models/contactform");

module.exports.createContactForm = async (req, res) => {
  try {

    const { name, contactNo, email, message, projectType } = req.body;

    // ✅ Validation
    if (!name || !contactNo || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    await ContactForm.create({
      name,
      contactNo,
      email,
      message,
      projectType: projectType || "Not sure yet",
    });

    res.status(200).json({
      success: true,
      message: "Form submitted successfully",
    });

  } catch (err) {
    console.error("Error in Contact Form Controller:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};