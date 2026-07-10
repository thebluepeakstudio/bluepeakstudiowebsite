const path = require("path");
const PDFDocument = require("pdfkit");
const Project = require("../models/Project");
const Client = require("../models/Client");
const { listDeliverables } = require("./projectDeliverable.service");
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
  if (!response.ok) throw new Error("Failed to load logo");
  return Buffer.from(await response.arrayBuffer());
};

let cachedLogoBuffer = null;
let cachedLogoUrl = null;

const getLogoBuffer = async (logoUrl) => {
  if (cachedLogoBuffer && cachedLogoUrl === logoUrl) return cachedLogoBuffer;
  cachedLogoBuffer = await fetchImageBuffer(logoUrl);
  cachedLogoUrl = logoUrl;
  return cachedLogoBuffer;
};

/** Stable invoice number derived from project ID (same project → same number). */
const getProjectInvoiceNumber = (projectId) => {
  const hex = String(projectId).replace(/[^a-f0-9]/gi, "");
  const suffix = hex.slice(-5) || "1";
  const num = parseInt(suffix, 16) % 100000;
  return String(num || 1).padStart(5, "0");
};

const buildIssuedToLines = (project, client) => {
  const lines = [];
  const company = project.businessName || client?.companyName;
  const contact = project.clientName || client?.name;

  if (company) lines.push(company);
  if (client?.address) {
    lines.push(...client.address.split(/\n|,/).map((s) => s.trim()).filter(Boolean));
  }
  if (project.contactNumber || client?.phone) {
    const label = contact && contact !== company ? `${contact}: ` : "";
    lines.push(`${label}${project.contactNumber || client?.phone}`);
  }
  if (project.email || client?.email) lines.push(project.email || client?.email);
  if (!lines.length) lines.push(project.clientName || "Client");
  return lines;
};

const generateProjectInvoicePdf = async (projectId) => {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new ApiError(404, "Project not found");

  const client = project.clientId ? await Client.findById(project.clientId).lean() : null;
  const deliverables = (await listDeliverables(projectId)).filter((d) => d.status !== "Cancelled");
  if (!deliverables.length) throw new ApiError(400, "No deliverables to invoice");

  const invoiceNumber = getProjectInvoiceNumber(projectId);
  const issuedDate = formatInvoiceDate();
  const issuedToLines = buildIssuedToLines(project, client);
  const subtotal = deliverables.reduce((sum, d) => sum + (Number(d.sellingPrice) || 0), 0);
  const { paymentDetails, logoUrl, companyName } = invoiceSettings;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () =>
        resolve({
          buffer: Buffer.concat(chunks),
          fileName: `Invoice-${invoiceNumber}-${project.projectTitle || project.clientName || "project"}.pdf`
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

      try {
        const logoBuffer = await getLogoBuffer(logoUrl);
        doc.image(logoBuffer, left, 40, { width: 72 });
      } catch {
        doc.font("Roboto").fontSize(10).fillColor("#64748b").text(companyName, left, 45);
      }

      doc
        .font("Roboto-Bold")
        .fontSize(34)
        .fillColor("#111827")
        .text("INVOICE", left, 55, { align: "right", width: pageWidth });

      const metaY = 130;
      doc
        .font("Roboto-Bold")
        .fontSize(10)
        .fillColor("#111827")
        .text(`INVOICE NO. ${invoiceNumber}`, left, metaY);

      doc
        .font("Roboto")
        .fontSize(10)
        .text(`Issued Date : ${issuedDate}`, left, metaY, { align: "right", width: pageWidth });

      const infoY = metaY + 28;
      doc.font("Roboto-Bold").fontSize(10).text("ISSUED TO :", left, infoY);
      doc.font("Roboto").fontSize(10);
      issuedToLines.forEach((line, i) => {
        doc.text(line, left, infoY + 14 + i * 14, { width: pageWidth * 0.55 });
      });

      const tableTop = infoY + Math.max(issuedToLines.length * 14 + 30, 70);
      const colDesc = left;
      const colQty = left + pageWidth * 0.52;
      const colPrice = left + pageWidth * 0.66;
      const colTotal = left + pageWidth * 0.8;
      const rowHeight = 24;

      doc.rect(left, tableTop, pageWidth, rowHeight).fillAndStroke("#f8fafc", "#cbd5e1");
      doc.fillColor("#334155").font("Roboto-Bold").fontSize(9);
      doc.text("DESCRIPTION", colDesc + 8, tableTop + 8, { width: pageWidth * 0.45 });
      doc.text("QTY", colQty, tableTop + 8, { width: 40, align: "center" });
      doc.text("PRICE", colPrice, tableTop + 8, { width: 80, align: "right" });
      doc.text("TOTAL", colTotal, tableTop + 8, { width: 80, align: "right" });

      let y = tableTop + rowHeight;
      doc.font("Roboto").fontSize(9).fillColor("#111827");

      deliverables.forEach((item) => {
        const price = Number(item.sellingPrice) || 0;
        doc.rect(left, y, pageWidth, rowHeight).stroke("#e2e8f0");
        doc.text(item.title, colDesc + 8, y + 8, { width: pageWidth * 0.45 });
        doc.text("1", colQty, y + 8, { width: 40, align: "center" });
        doc.text(formatInr(price), colPrice, y + 8, { width: 80, align: "right" });
        doc.text(formatInr(price), colTotal, y + 8, { width: 80, align: "right" });
        y += rowHeight;
      });

      y += 10;
      doc.font("Roboto-Bold").fontSize(10);
      doc.text("Subtotal", colPrice - 20, y, { width: 90, align: "right" });
      doc.text(formatInr(subtotal), colTotal, y, { width: 80, align: "right" });
      y += 18;
      doc.text("Total", colPrice - 20, y, { width: 90, align: "right" });
      doc.text(formatInr(subtotal), colTotal, y, { width: 80, align: "right" });

      y += 48;
      doc.font("Roboto-Bold").fontSize(10).fillColor("#111827").text("PAYMENT TO :", left, y);
      y += 18;

      const paymentRows = [
        ["Bank", paymentDetails.bank],
        ["IFSC Code", paymentDetails.ifsc],
        ["Account No.", paymentDetails.accountNo],
        ["Account Name", paymentDetails.accountName],
      ];

      doc.font("Roboto").fontSize(10);
      paymentRows.forEach(([label, value]) => {
        doc.font("Roboto-Bold").text(label, left, y, { width: 110 });
        doc.font("Roboto").text(`: ${value}`, left + 110, y, { width: pageWidth - 110 });
        y += 16;
      });

      y += 24;
      doc.font("Roboto-Bold").fontSize(14).text("THANK YOU", left, y, {
        align: "center",
        width: pageWidth,
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const getServiceInvoiceNumber = getProjectInvoiceNumber;

module.exports = {
  generateProjectInvoicePdf,
  getProjectInvoiceNumber,
  getServiceInvoiceNumber,
};
