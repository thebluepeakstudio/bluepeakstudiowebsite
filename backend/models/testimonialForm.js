const mongoose = require("mongoose")

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  message: {
    type: String,
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    index: true,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("TestimonialForm", testimonialSchema);