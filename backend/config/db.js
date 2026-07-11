const mongoose = require("mongoose");

function mongoUsesTls(uri) {
  return uri.startsWith("mongodb+srv://") || /[?&]ssl=true/i.test(uri);
}

/**
 * Connect to MongoDB. Prefer MONGO_URL from .env.
 * Use a standard mongodb:// URI (not mongodb+srv://) if you see querySrv ECONNREFUSED on Windows.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URL;

  if (!uri) {
    throw new Error("MONGO_URL is not set in .env");
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !mongoUsesTls(uri)) {
    throw new Error(
      "MONGO_URL must use TLS in production (mongodb+srv:// or ssl=true in connection string)"
    );
  }

  const options = {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  };

  if (isProd) {
    options.tls = true;
  }

  await mongoose.connect(uri, options);
  console.log("MongoDB Connected");
};

module.exports = connectDB;
