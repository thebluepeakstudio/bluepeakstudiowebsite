const path = require("path");
const PDFDocument = require("pdfkit");
const Project = require("../models/Project");
const Service = require("../models/Service");
const Client = require("../models/Client");
const { listDeliverables: listProjectDeliverables } = require("./projectDeliverable.service");
const { listDeliverables: listServiceDeliverables } = require("./deliverable.service");
const invoiceSettings = require("../constants/invoiceSettings");
const ApiError = require("../utils/ApiError");

const FONT_REGULAR = path.join(__dirname, "../assets/fonts/NotoSans-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/NotoSans-Bold.ttf");

const formatInr = (amount) => {
  const value = Number(amount) || 0;
  return `\u20B9${value.toLocaleString("en-IN")}`;
};

const formatInvoiceDate = (date = new Date()) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fetchImageBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load image");
  return Buffer.from(await response.arrayBuffer());
};

let cachedLogoBuffer = null;
let cachedLogoUrl = null;
let cachedSignatureBuffer = null;
let cachedSignatureUrl = null;

const getLogoBuffer = async (logoUrl) => {
  if (cachedLogoBuffer && cachedLogoUrl === logoUrl) return cachedLogoBuffer;
  cachedLogoBuffer = await fetchImageBuffer(logoUrl);
  cachedLogoUrl = logoUrl;
  return cachedLogoBuffer;
};

const getSignatureBuffer = async (signatureUrl) => {
  if (cachedSignatureBuffer && cachedSignatureUrl === signatureUrl) {
    return cachedSignatureBuffer;
  }
  cachedSignatureBuffer = await fetchImageBuffer(signatureUrl);
  cachedSignatureUrl = signatureUrl;
  return cachedSignatureBuffer;
};

/** Stable invoice number derived from owner ID (same id → same number). */
const getProjectInvoiceNumber = (ownerId) => {
  const hex = String(ownerId).replace(/[^a-f0-9]/gi, "");
  const suffix = hex.slice(-5) || "1";
  const num = parseInt(suffix, 16) % 100000;
  return String(num || 1).padStart(5, "0");
};

const buildIssuedToLines = (owner, client) => {
  const lines = [];
  const company = owner.businessName || client?.companyName;
  const contact = owner.clientName || client?.name;

  if (company) lines.push(company);
  if (client?.address) {
    lines.push(...client.address.split(/\n|,/).map((s) => s.trim()).filter(Boolean));
  }
  if (owner.contactNumber || client?.phone) {
    const label = contact && contact !== company ? `${contact}: ` : "";
    lines.push(`${label}${owner.contactNumber || client?.phone}`);
  }
  if (owner.email || client?.email) lines.push(owner.email || client?.email);
  if (!lines.length) lines.push(owner.clientName || "Client");
  return lines;
};

const COLORS = {
  foreground: "#171717",
  muted: "#737373",
  border: "#E5E5E5",
  surface: "#FAFAFA",
  white: "#FFFFFF",
};

const drawHairline = (doc, x, y, width) => {
  doc
    .moveTo(x, y)
    .lineTo(x + width, y)
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .stroke();
};

const renderInvoicePdf = async ({
  owner,
  client,
  deliverables,
  invoiceNumber,
  fileLabel,
}) => {
  const issuedDate = formatInvoiceDate();
  const issuedToLines = buildIssuedToLines(owner, client);
  const subtotal = deliverables.reduce((sum, d) => sum + (Number(d.sellingPrice) || 0), 0);
  const { paymentDetails, logoUrl, signatureUrl, companyName } = invoiceSettings;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 56 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () =>
        resolve({
          buffer: Buffer.concat(chunks),
          fileName: `Invoice-${invoiceNumber}-${fileLabel}.pdf`
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/-+/g, "-"),
          invoiceNumber,
        })
      );
      doc.on("error", reject);

      doc.registerFont("Roboto", FONT_REGULAR);
      doc.registerFont("Roboto-Bold", FONT_BOLD);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const left = doc.page.margins.left;
      const right = left + pageWidth;

      // Header
      let y = 48;
      try {
        const logoBuffer = await getLogoBuffer(logoUrl);
        doc.image(logoBuffer, left, y, { width: 56 });
      } catch {
        doc
          .font("Roboto-Bold")
          .fontSize(13)
          .fillColor(COLORS.foreground)
          .text(companyName, left, y + 8);
      }

      doc
        .font("Roboto-Bold")
        .fontSize(28)
        .fillColor(COLORS.foreground)
        .text("Invoice", left, y + 4, { align: "right", width: pageWidth });

      y = 120;
      drawHairline(doc, left, y, pageWidth);
      y += 24;

      // Meta row
      doc.font("Roboto").fontSize(10).fillColor(COLORS.muted).text("Invoice number", left, y);
      doc
        .font("Roboto-Bold")
        .fontSize(10)
        .fillColor(COLORS.foreground)
        .text(String(invoiceNumber), left, y + 14);

      doc.font("Roboto").fontSize(10).fillColor(COLORS.muted).text("Issued", right - 160, y, {
        width: 160,
        align: "right",
      });
      doc
        .font("Roboto-Bold")
        .fontSize(10)
        .fillColor(COLORS.foreground)
        .text(issuedDate, right - 160, y + 14, { width: 160, align: "right" });

      y += 48;

      // Issued to
      doc.font("Roboto").fontSize(10).fillColor(COLORS.muted).text("Bill to", left, y);
      y += 16;
      issuedToLines.forEach((line, i) => {
        doc
          .font(i === 0 ? "Roboto-Bold" : "Roboto")
          .fontSize(11)
          .fillColor(COLORS.foreground)
          .text(line, left, y, { width: pageWidth * 0.55 });
        y += 15;
      });

      y += 28;
      drawHairline(doc, left, y, pageWidth);
      y += 16;

      // Table header
      const colDesc = left;
      const colQty = left + pageWidth * 0.55;
      const colPrice = left + pageWidth * 0.68;
      const colTotal = left + pageWidth * 0.82;
      const rowPad = 12;

      doc.font("Roboto").fontSize(9).fillColor(COLORS.muted);
      doc.text("Description", colDesc, y, { width: pageWidth * 0.5 });
      doc.text("Qty", colQty, y, { width: 36, align: "center" });
      doc.text("Price", colPrice, y, { width: 70, align: "right" });
      doc.text("Amount", colTotal, y, { width: 70, align: "right" });
      y += 14;
      drawHairline(doc, left, y, pageWidth);
      y += rowPad;

      // Line items
      deliverables.forEach((item, index) => {
        const price = Number(item.sellingPrice) || 0;
        if (index > 0) {
          drawHairline(doc, left, y - 6, pageWidth);
        }
        doc.font("Roboto").fontSize(10).fillColor(COLORS.foreground);
        doc.text(item.title, colDesc, y, { width: pageWidth * 0.5 });
        doc.text("1", colQty, y, { width: 36, align: "center" });
        doc.text(formatInr(price), colPrice, y, { width: 70, align: "right" });
        doc.text(formatInr(price), colTotal, y, { width: 70, align: "right" });
        y += 28;
      });

      drawHairline(doc, left, y, pageWidth);
      y += 20;

      // Totals
      const totalsLabelX = colPrice - 24;
      const totalsValueX = colTotal;
      doc.font("Roboto").fontSize(10).fillColor(COLORS.muted);
      doc.text("Subtotal", totalsLabelX, y, { width: 90, align: "right" });
      doc.font("Roboto").fontSize(10).fillColor(COLORS.foreground);
      doc.text(formatInr(subtotal), totalsValueX, y, { width: 70, align: "right" });
      y += 22;

      doc.rect(totalsLabelX - 8, y - 6, right - (totalsLabelX - 8), 28).fill(COLORS.surface);
      doc.font("Roboto-Bold").fontSize(11).fillColor(COLORS.foreground);
      doc.text("Total", totalsLabelX, y, { width: 90, align: "right" });
      doc.text(formatInr(subtotal), totalsValueX, y, { width: 70, align: "right" });
      y += 48;

      // Payment
      drawHairline(doc, left, y, pageWidth);
      y += 20;
      doc.font("Roboto").fontSize(10).fillColor(COLORS.muted).text("Payment details", left, y);
      y += 18;

      const paymentRows = [
        ["Bank", paymentDetails.bank],
        ["IFSC", paymentDetails.ifsc],
        ["Account number", paymentDetails.accountNo],
        ["Account name", paymentDetails.accountName],
      ];

      paymentRows.forEach(([label, value]) => {
        doc.font("Roboto").fontSize(10).fillColor(COLORS.muted).text(label, left, y, { width: 120 });
        doc
          .font("Roboto")
          .fontSize(10)
          .fillColor(COLORS.foreground)
          .text(value, left + 130, y, { width: pageWidth - 130 });
        y += 16;
      });

      // Signature (with extra breathing room above thank you)
      y += 36;
      const signatureWidth = 120;
      try {
        const signatureBuffer = await getSignatureBuffer(signatureUrl);
        const signatureX = left + (pageWidth - signatureWidth) / 2;
        doc.image(signatureBuffer, signatureX, y, { width: signatureWidth });
        y += 64;
      } catch {
        // Skip signature if image fails to load
      }

      y += 28;
      doc
        .font("Roboto")
        .fontSize(11)
        .fillColor(COLORS.muted)
        .text("Thank you", left, y, {
          align: "center",
          width: pageWidth,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const generateProjectInvoicePdf = async (projectId) => {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new ApiError(404, "Project not found");

  const client = project.clientId ? await Client.findById(project.clientId).lean() : null;
  const deliverables = (await listProjectDeliverables(projectId)).filter(
    (d) => d.status !== "Cancelled"
  );
  if (!deliverables.length) throw new ApiError(400, "No deliverables to invoice");

  return renderInvoicePdf({
    owner: project,
    client,
    deliverables,
    invoiceNumber: project.invoiceNumber || getProjectInvoiceNumber(projectId),
    fileLabel: project.projectTitle || project.clientName || "project",
  });
};

const generateServiceInvoicePdf = async (serviceId) => {
  const service = await Service.findById(serviceId).lean();
  if (!service) throw new ApiError(404, "Service not found");

  const client = service.clientId ? await Client.findById(service.clientId).lean() : null;
  const deliverables = (await listServiceDeliverables(serviceId)).filter(
    (d) => d.status !== "Cancelled"
  );
  if (!deliverables.length) throw new ApiError(400, "No deliverables to invoice");

  return renderInvoicePdf({
    owner: service,
    client,
    deliverables,
    invoiceNumber: service.invoiceNumber || getProjectInvoiceNumber(serviceId),
    fileLabel: service.name || service.clientName || "service",
  });
};

const getServiceInvoiceNumber = getProjectInvoiceNumber;

module.exports = {
  generateProjectInvoicePdf,
  generateServiceInvoicePdf,
  getProjectInvoiceNumber,
  getServiceInvoiceNumber,
};
