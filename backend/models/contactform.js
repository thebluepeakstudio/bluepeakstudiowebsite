const mongoose = require("mongoose");

const contactFormSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contactNo: {
    type: String, // ✅ changed from Number → String (IMPORTANT)
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  projectType: {
    type: String,
    trim: true,
    default: "Not sure yet",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

contactFormSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ContactForm", contactFormSchema);
