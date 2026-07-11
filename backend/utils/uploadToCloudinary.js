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

const PUBLIC_FOLDER_PREFIX = "bluepeak/blog";

const isSensitiveFolder = (folder = "") => {
  const normalized = String(folder).replace(/\\/g, "/");
  if (!normalized.startsWith("bluepeak/")) return true;
  return !normalized.startsWith(PUBLIC_FOLDER_PREFIX);
};

const isSensitivePublicId = (publicId = "") => {
  const normalized = String(publicId).replace(/\\/g, "/");
  if (!normalized.startsWith("bluepeak/")) return true;
  return !normalized.startsWith(PUBLIC_FOLDER_PREFIX);
};

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
  const sensitive = options.accessMode
    ? options.accessMode === "authenticated"
    : isSensitiveFolder(targetFolder);

  const uploadParams = {
    resource_type: strategy.resourceType,
    folder: targetFolder,
    public_id: publicId,
    overwrite: false,
    use_filename: false,
    unique_filename: false,
  };
  if (strategy.format) uploadParams.format = strategy.format;
  if (sensitive) uploadParams.type = "authenticated";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadParams, (error, result) => {
      if (error) return reject(error);
      resolve({
        ...result,
        storedFormat: strategy.format || result.format || inferredFormat,
        accessMode: sensitive ? "authenticated" : "public",
      });
    });
    Readable.from(buffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    const type = isSensitivePublicId(publicId) ? "authenticated" : "upload";
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type });
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
};

const getResourceType = (doc) => doc.resourceType || (isPdfFile(doc.fileName) ? "image" : "raw");

const getFormat = (doc) =>
  doc.format || (isPdfFile(doc.fileName) ? "pdf" : path.extname(doc.fileName || "").slice(1)) || undefined;

const getDeliveryType = (doc) => {
  if (doc.accessMode === "authenticated") return "authenticated";
  if (doc.accessMode === "public") return "upload";
  return isSensitivePublicId(doc.publicId) ? "authenticated" : "upload";
};

const buildSignedUrl = (doc) => {
  if (!doc.publicId) return null;

  return cloudinary.url(doc.publicId, {
    resource_type: getResourceType(doc),
    type: getDeliveryType(doc),
    secure: true,
    sign_url: true,
    ...(getFormat(doc) ? { format: getFormat(doc) } : {}),
  });
};

const getDocumentPrivateUrl = (doc, { attachment = false } = {}) => {
  if (!doc.publicId) return null;

  return cloudinary.utils.private_download_url(doc.publicId, getFormat(doc) || "", {
    resource_type: getResourceType(doc),
    type: getDeliveryType(doc),
    attachment,
    expires_at: Math.round(Date.now() / 1000) + 3600,
  });
};

const sanitizeFileRecord = (record) => {
  if (!record) return record;
  const plain = record.toObject ? record.toObject() : { ...record };
  if (isSensitivePublicId(plain.publicId) || plain.accessMode === "authenticated") {
    delete plain.fileUrl;
  }
  return plain;
};

const fetchDocumentBuffer = async (doc) => {
  const candidates = [buildSignedUrl(doc), getDocumentPrivateUrl(doc)].filter(Boolean);

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

const streamStoredFile = async (doc, res, { attachment = false } = {}) => {
  const buffer = await fetchDocumentBuffer(doc);
  const ext = doc.fileName?.split(".").pop()?.toLowerCase();
  const mimeTypes = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  const contentType = mimeTypes[ext] || "application/octet-stream";
  const disposition = attachment ? "attachment" : "inline";

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${encodeURIComponent(doc.fileName || "file")}"`
  );
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(buffer);
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  fetchDocumentBuffer,
  streamStoredFile,
  sanitizeFileRecord,
  isSensitiveFolder,
  isSensitivePublicId,
  isRawDocument,
  isPdfFile,
};
