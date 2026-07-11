const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { streamStoredFile } = require("../../utils/uploadToCloudinary");

const viewClientAttachment = asyncHandler(async (req, res) => {
  const ClientAttachment = require("../../models/ClientAttachment");
  const attachment = await ClientAttachment.findById(req.params.attachmentId);
  if (!attachment || attachment.clientId.toString() !== req.params.id) {
    throw new ApiError(404, "Attachment not found");
  }

  try {
    await streamStoredFile(attachment, res, {
      attachment: req.query.attachment === "1",
    });
  } catch (err) {
    if (err.message === "CLOUDINARY_PDF_DELIVERY_BLOCKED") {
      throw new ApiError(503, err.cloudinaryHint);
    }
    throw new ApiError(502, "Failed to load attachment from storage");
  }
});

const viewLeadAttachment = asyncHandler(async (req, res) => {
  const LeadAttachment = require("../../models/LeadAttachment");
  const attachment = await LeadAttachment.findById(req.params.attachmentId);
  if (!attachment || attachment.leadId.toString() !== req.params.id) {
    throw new ApiError(404, "Attachment not found");
  }

  try {
    await streamStoredFile(attachment, res, {
      attachment: req.query.attachment === "1",
    });
  } catch (err) {
    if (err.message === "CLOUDINARY_PDF_DELIVERY_BLOCKED") {
      throw new ApiError(503, err.cloudinaryHint);
    }
    throw new ApiError(502, "Failed to load attachment from storage");
  }
});

module.exports = { viewClientAttachment, viewLeadAttachment };
