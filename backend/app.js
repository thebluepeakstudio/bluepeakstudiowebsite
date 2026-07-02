require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const ensureAdminSeed = require("./utils/ensureAdminSeed");
const errorHandler = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  "https://bluepeakstudiowebsite.onrender.com",
  "https://bluepeakstudiowebsite-1.onrender.com",
  "https://bluepeakstudiowebsite-cx3r.onrender.com",
  "https://bluepeakstudio.in",
  "https://www.bluepeakstudio.in",
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

const healthRoutes = require("./routes/health.routes");
app.use("/api/health", healthRoutes);

const contactFormRoute = require("./routes/contactForm.routes");
app.use("/api/contact", contactFormRoute);

const testimonialRoute = require("./routes/testimonialForm.routes");
app.use("/api/testimonial", testimonialRoute);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

const blogPublicRoutes = require("./routes/blog.routes");
app.use("/api/blog", blogPublicRoutes);

const sitemapRoutes = require("./routes/sitemap.routes");
app.use("/", sitemapRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Page not found" });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    if (err.message?.includes("querySrv") || err.code === "ECONNREFUSED") {
      console.error(
        "Tip: Use the standard mongodb:// connection string from Atlas (not mongodb+srv://). See backend/.env.example"
      );
    }
  }

  try {
    await ensureAdminSeed();
  } catch (err) {
    console.error("[admin-seed] Failed:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

startServer();
