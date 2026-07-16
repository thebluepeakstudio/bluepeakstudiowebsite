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
    const clientMessage = String(message).trim();

    await ContactForm.create({
      name,
      contactNo,
      email,
      message: clientMessage,
      projectType: resolvedProjectType,
    });

    const normalizedEmail = email.trim().toLowerCase();
    const existingLead = await Lead.findOne({
      email: normalizedEmail,
      status: { $nin: ["Won", "Lost"] },
    });

    if (existingLead) {
      const previousNotes = existingLead.notes?.trim();
      existingLead.notes = previousNotes
        ? `${previousNotes}\n\n${clientMessage}`
        : clientMessage;
      existingLead.lastContactDate = new Date();
      if (!existingLead.phone) existingLead.phone = String(contactNo).trim();
      await existingLead.save();
    } else {
      await Lead.create({
        fullName: name.trim(),
        email: normalizedEmail,
        phone: String(contactNo).trim(),
        leadSource: "Website",
        status: "New",
        priority: "Medium",
        notes: clientMessage,
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
