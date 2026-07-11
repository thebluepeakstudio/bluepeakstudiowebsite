const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".zip",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);

const isAllowedUpload = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) return false;
  return true;
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!isAllowedUpload(file)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

module.exports = upload;
