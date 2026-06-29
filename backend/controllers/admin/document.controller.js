const Document = require("../../models/Document");
const Project = require("../../models/Project");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  getDocumentDeliveryUrl,
  fetchDocumentBuffer,
} = require("../../utils/uploadToCloudinary");
const { buildProjectDocumentFolder } = require("../../utils/cloudinaryPaths");

const withDocumentUrls = (doc) => {
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...plain,
    viewUrl: `/api/admin/documents/${plain._id}/view`,
    downloadUrl: getDocumentDeliveryUrl(plain),
    uploadedAt: plain.createdAt,
  };
};

const getDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const filter = { projectId };
  if (req.query.category) filter.category = req.query.category;

  const documents = await Document.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: documents.map(withDocumentUrls) });
});

const uploadDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId).populate("clientId", "name companyName");
  if (!project) throw new ApiError(404, "Project not found");

  if (!req.files?.length) {
    throw new ApiError(400, "No files received. Ensure files are attached before uploading.");
  }

  const category = req.body.category || "Other Attachments";
  const folder = buildProjectDocumentFolder(project);

  const docs = await Promise.all(
    req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, folder, {
        filename: file.originalname,
        mimeType: file.mimetype,
      });
      return Document.create({
        projectId,
        fileName: file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        format: result.storedFormat || result.format,
        resourceType: result.resource_type || "image",
        category,
        uploadedBy: req.admin.name,
      });
    })
  );

  res.status(201).json({ success: true, data: docs.map(withDocumentUrls) });
});

const guessMimeType = (fileName) => {
  const ext = fileName?.split(".").pop()?.toLowerCase();
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
  return mimeTypes[ext] || "application/octet-stream";
};

const viewDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Document not found");

  let buffer;
  try {
    buffer = await fetchDocumentBuffer(doc);
  } catch (err) {
    if (err.message === "CLOUDINARY_PDF_DELIVERY_BLOCKED") {
      throw new ApiError(503, err.cloudinaryHint);
    }
    throw new ApiError(502, err.message || "Failed to load document from storage");
  }

  const contentType = guessMimeType(doc.fileName);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(buffer);
});

const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Document not found");

  await deleteFromCloudinary(doc.publicId, doc.resourceType || "image");
  await Document.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: "Document deleted" });
});

module.exports = { getDocuments, uploadDocuments, viewDocument, deleteDocument };
