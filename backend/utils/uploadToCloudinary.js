const path = require("path");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");
const { isPdfFile, slugify } = require("./cloudinaryPaths");

const RAW_EXTENSIONS = new Set([
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

const isRawDocument = (filename, mimeType) => {
  if (isPdfFile(filename, mimeType)) return false;
  const ext = path.extname(String(filename || "")).toLowerCase();
  return RAW_EXTENSIONS.has(ext);
};

const parseFileIdentity = (folder, filename) => {
  const ext = path.extname(filename).toLowerCase();
  const base = slugify(path.basename(filename, ext), "file");
  const unique = `${base}-${Date.now().toString(36).slice(-4)}`;
  return {
    folder,
    publicId: unique,
    format: ext.slice(1) || undefined,
  };
};

const getUploadStrategy = (filename, mimeType) => {
  if (isPdfFile(filename, mimeType)) {
    return { resourceType: "image", format: "pdf" };
  }
  if (isRawDocument(filename, mimeType)) {
    return {
      resourceType: "raw",
      format: path.extname(filename).slice(1).toLowerCase() || undefined,
    };
  }
  return { resourceType: "auto", format: undefined };
};

const uploadToCloudinary = (buffer, folder = "bluepeak-admin", options = {}) => {
  const filename = options.filename || "file";
  const { folder: targetFolder, publicId, format: inferredFormat } = parseFileIdentity(folder, filename);
  const strategy = getUploadStrategy(filename, options.mimeType);

  const uploadParams = {
    resource_type: strategy.resourceType,
    folder: targetFolder,
    public_id: publicId,
    overwrite: false,
    use_filename: false,
    unique_filename: false,
  };
  if (strategy.format) uploadParams.format = strategy.format;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadParams, (error, result) => {
      if (error) return reject(error);
      resolve({
        ...result,
        storedFormat: strategy.format || result.format || inferredFormat,
      });
    });
    Readable.from(buffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
};

const getResourceType = (doc) => doc.resourceType || (isPdfFile(doc.fileName) ? "image" : "raw");

const getFormat = (doc) =>
  doc.format || (isPdfFile(doc.fileName) ? "pdf" : path.extname(doc.fileName || "").slice(1)) || undefined;

const buildSignedUrl = (doc) => {
  if (!doc.publicId) return doc.fileUrl;

  return cloudinary.url(doc.publicId, {
    resource_type: getResourceType(doc),
    type: "upload",
    secure: true,
    sign_url: true,
    ...(getFormat(doc) ? { format: getFormat(doc) } : {}),
  });
};

const getDocumentPrivateUrl = (doc, { attachment = false } = {}) => {
  if (!doc.publicId) return doc.fileUrl;

  return cloudinary.utils.private_download_url(doc.publicId, getFormat(doc) || "", {
    resource_type: getResourceType(doc),
    type: "upload",
    attachment,
    expires_at: Math.round(Date.now() / 1000) + 3600,
  });
};

const getDocumentDeliveryUrl = (doc) => buildSignedUrl(doc) || getDocumentPrivateUrl(doc, { attachment: true });

const fetchDocumentBuffer = async (doc) => {
  const candidates = [buildSignedUrl(doc), doc.fileUrl, getDocumentPrivateUrl(doc)].filter(Boolean);

  let lastError = null;
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (
          body.includes("untrusted") ||
          body.includes("Blocked for delivery") ||
          body.includes("show_original_customer_untrusted")
        ) {
          const err = new Error("CLOUDINARY_PDF_DELIVERY_BLOCKED");
          err.cloudinaryHint =
            'PDF delivery may still be blocked. In Cloudinary → Settings → Security, enable "Allow delivery of PDF and ZIP files", save, then re-upload the file.';
          throw err;
        }
        lastError = new Error(`Cloudinary fetch failed (${response.status})`);
        continue;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      if (err.message === "CLOUDINARY_PDF_DELIVERY_BLOCKED") throw err;
      lastError = err;
    }
  }

  throw lastError || new Error("Cloudinary fetch failed");
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getDocumentDeliveryUrl,
  getDocumentPrivateUrl,
  fetchDocumentBuffer,
  isRawDocument,
  isPdfFile,
};
