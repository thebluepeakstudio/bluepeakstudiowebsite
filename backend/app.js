require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  "https://bluepeakstudiowebsite.onrender.com",
  "https://bluepeakstudio.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Backend running");
});

connectDB().catch((err) => {
  console.error("MongoDB connection failed:", err.message);
  if (err.message?.includes("querySrv") || err.code === "ECONNREFUSED") {
    console.error(
      "Tip: Use the standard mongodb:// connection string from Atlas (not mongodb+srv://). See backend/.env.example"
    );
  }
});

const contactFormRoute = require("./routes/contactForm.routes");
app.use("/api/contact", contactFormRoute);

const testimonialRoute = require("./routes/testimonialForm.routes");
app.use("/api/testimonial", testimonialRoute);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
