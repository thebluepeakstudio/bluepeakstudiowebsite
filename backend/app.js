require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const ensureAdminSeed = require("./utils/ensureAdminSeed");
const ensurePaymentSummariesRecalculated = require("./utils/ensurePaymentSummaries");
const ensureDeprecatedFieldsDropped = require("./utils/ensureDeprecatedFieldsDropped");
const validateEnv = require("./utils/validateEnv");
const correlationIdMiddleware = require("./middleware/correlationId.middleware");
const errorHandler = require("./middleware/error.middleware");
const { corsOrigin } = require("./utils/corsOrigins");

const app = express();
const PORT = process.env.PORT || 10000;

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(correlationIdMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: "deny" },
  })
);

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-Id"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.use(cookieParser());
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

const websitePublicRoutes = require("./routes/website.routes");
app.use("/api/website", websitePublicRoutes);

const sitemapRoutes = require("./routes/sitemap.routes");
app.use("/", sitemapRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
    correlationId: req.correlationId,
  });
});

app.use(errorHandler);

const startServer = async () => {
  validateEnv();

  try {
    await connectDB();
  } catch (err) {
    console.error("[FATAL] MongoDB connection failed:", err.message);
    if (err.message?.includes("querySrv") || err.code === "ECONNREFUSED") {
      console.error(
        "Tip: Use the standard mongodb:// connection string from Atlas (not mongodb+srv://). See backend/.env.example"
      );
    }
    process.exit(1);
  }

  try {
    await ensureAdminSeed();
  } catch (err) {
    console.error("[admin-seed] Failed:", err.message);
  }

  try {
    await ensurePaymentSummariesRecalculated();
  } catch (err) {
    console.error("[payment-recompute] Failed:", err.message);
  }

  try {
    await ensureDeprecatedFieldsDropped();
  } catch (err) {
    console.error("[schema-cleanup] Failed:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

startServer();
