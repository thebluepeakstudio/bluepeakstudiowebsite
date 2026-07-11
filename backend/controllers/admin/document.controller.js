const Document = require("../../models/Document");
const Project = require("../../models/Project");
const Service = require("../../models/Service");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  streamStoredFile,
  sanitizeFileRecord,
} = require("../../utils/uploadToCloudinary");
const { buildProjectDocumentFolder } = require("../../utils/cloudinaryPaths");

const withDocumentUrls = (doc) => {
  const plain = sanitizeFileRecord(doc);
  return {
    ...plain,
    viewUrl: `/api/admin/documents/${plain._id}/view`,
    downloadUrl: `/api/admin/documents/${plain._id}/view?attachment=1`,
    uploadedAt: plain.createdAt,
  };
};

const resolveDocumentOwner = async (ownerId) => {
  const project = await Project.findById(ownerId).populate("clientId", "name companyName");
  if (project) {
    return { owner: project, ownerId, documentIds: [ownerId] };
  }

  const service = await Service.findById(ownerId).populate("clientId", "name companyName");
  if (!service) return null;

  const documentIds = [ownerId];
  if (service.legacyProjectId) documentIds.push(service.legacyProjectId);

  const owner = service.toObject();
  owner.projectTitle = service.name;

  return { owner, ownerId, documentIds };
};

const getDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const resolved = await resolveDocumentOwner(projectId);
  if (!resolved) throw new ApiError(404, "Project not found");

  const filter = { projectId: { $in: resolved.documentIds } };
  if (req.query.category) filter.category = req.query.category;

  const documents = await Document.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: documents.map(withDocumentUrls) });
});

const uploadDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const resolved = await resolveDocumentOwner(projectId);
  if (!resolved) throw new ApiError(404, "Project not found");

  if (!req.files?.length) {
    throw new ApiError(400, "No files received. Ensure files are attached before uploading.");
  }

  const category = req.body.category || "Other Attachments";
  const folder = buildProjectDocumentFolder(resolved.owner);

  const docs = await Promise.all(
    req.files.map(async (file) => {
      const result = await uploadToCloudinary(file.buffer, folder, {
        filename: file.originalname,
        mimeType: file.mimetype,
      });
      return Document.create({
        projectId: resolved.ownerId,
        fileName: file.originalname,
        fileUrl: result.secure_url,
        publicId: result.public_id,
        format: result.storedFormat || result.format,
        resourceType: result.resource_type || "image",
        accessMode: result.accessMode,
        category,
        uploadedBy: req.admin.name,
      });
    })
  );

  res.status(201).json({ success: true, data: docs.map(withDocumentUrls) });
});

const viewDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Document not found");

  try {
    await streamStoredFile(doc, res, { attachment: req.query.attachment === "1" });
  } catch (err) {
    if (err.message === "CLOUDINARY_PDF_DELIVERY_BLOCKED") {
      throw new ApiError(503, err.cloudinaryHint);
    }
    throw new ApiError(502, "Failed to load document from storage");
  }
});

const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Document not found");

  await deleteFromCloudinary(doc.publicId, doc.resourceType || "image");
  await Document.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: "Document deleted" });
});

module.exports = { getDocuments, uploadDocuments, viewDocument, deleteDocument };
