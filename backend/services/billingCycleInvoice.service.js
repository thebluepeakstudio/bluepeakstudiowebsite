const path = require("path");
const PDFDocument = require("pdfkit");
const Service = require("../models/Service");
const Client = require("../models/Client");
const BillingCycle = require("../models/BillingCycle");
const BillingCycleInvoice = require("../models/BillingCycleInvoice");
const BillingCycleDeliverable = require("../models/BillingCycleDeliverable");
const invoiceSettings = require("../constants/invoiceSettings");
const ApiError = require("../utils/ApiError");
const { formatPeriodLabel } = require("../utils/recurringDates");
const { getServiceInvoiceNumber } = require("./invoice.service");
const { withLegacyServiceFields } = require("../utils/serviceCompat");

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

const buildIssuedToLines = (service, client) => {
  const lines = [];
  const company = client?.companyName || service.businessName;
  const contact = client?.name || service.clientName;
  if (company) lines.push(company);
  if (contact && contact !== company) lines.push(contact);
  const address = client?.address?.trim();
  if (address) {
    lines.push(...address.split(/\n|,/).map((s) => s.trim()).filter(Boolean));
  }
  if (client?.phone || service.contactNumber) {
    lines.push(client?.phone || service.contactNumber);
  }
  if (client?.email || service.email) lines.push(client?.email || service.email);
  if (!lines.length) lines.push(contact || company || "Client");
  return lines;
};

const generateBillingCycleInvoicePdf = async (serviceId, cycleId) => {
  const serviceDoc = await Service.findById(serviceId).lean();
  if (!serviceDoc) throw new ApiError(404, "Service not found");
  if (serviceDoc.billingModel !== "recurring") {
    throw new ApiError(400, "Service is not recurring");
  }
  const service = withLegacyServiceFields(serviceDoc);

  const cycle = await BillingCycle.findOne({ _id: cycleId, serviceId }).lean();
  if (!cycle) throw new ApiError(404, "Billing cycle not found");

  const invoice = await BillingCycleInvoice.findOne({ billingCycleId: cycleId }).lean();
  if (!invoice) throw new ApiError(404, "Cycle invoice not found");

  const deliverables = await BillingCycleDeliverable.find({ billingCycleId: cycleId })
    .sort({ sortOrder: 1 })
    .lean();

  const clientId = serviceDoc.clientId?._id || serviceDoc.clientId;
  const client = clientId ? await Client.findById(clientId).lean() : null;
  const periodLabel = formatPeriodLabel(new Date(cycle.periodMonth));
  const invoiceNumber = `${getServiceInvoiceNumber(serviceId)}-${periodLabel.replace(/\s/g, "")}`;
  const issuedDate = formatInvoiceDate(invoice.dueDate || cycle.billingDate);
  const issuedToLines = buildIssuedToLines(service, client);
  const subtotal = Number(invoice.amountDue) || 0;
  const creditApplied = Number(invoice.creditApplied) || 0;
  const amountPaid = Number(invoice.amountPaid) || 0;
  const balanceDue = Math.max(0, subtotal - creditApplied - amountPaid);
  const { paymentDetails, companyName } = invoiceSettings;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () =>
        resolve({
          buffer: Buffer.concat(chunks),
          fileName: `Invoice-${invoiceNumber}-${service.name || service.clientName || "service"}.pdf`
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

      doc.font("Roboto").fontSize(10).fillColor("#64748b").text(companyName, left, 45);
      doc
        .font("Roboto-Bold")
        .fontSize(34)
        .fillColor("#111827")
        .text("INVOICE", left, 55, { align: "right", width: pageWidth });

      const metaY = 130;
      doc.font("Roboto-Bold").fontSize(10).fillColor("#111827").text(`INVOICE NO. ${invoiceNumber}`, left, metaY);
      doc
        .font("Roboto")
        .fontSize(10)
        .text(`Billing Period : ${periodLabel}`, left, metaY + 14);
      doc.text(`Due Date : ${issuedDate}`, left, metaY, { align: "right", width: pageWidth });

      const infoY = metaY + 36;
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

      if (deliverables.length) {
        deliverables.forEach((item) => {
          doc.rect(left, y, pageWidth, rowHeight).stroke("#e2e8f0");
          doc.text(`${item.title} (${periodLabel})`, colDesc + 8, y + 8, { width: pageWidth * 0.45 });
          doc.text("1", colQty, y + 8, { width: 40, align: "center" });
          doc.text("—", colPrice, y + 8, { width: 80, align: "right" });
          doc.text("—", colTotal, y + 8, { width: 80, align: "right" });
          y += rowHeight;
        });
      } else {
        doc.rect(left, y, pageWidth, rowHeight).stroke("#e2e8f0");
        doc.text(`Monthly retainer (${periodLabel})`, colDesc + 8, y + 8, { width: pageWidth * 0.45 });
        doc.text("1", colQty, y + 8, { width: 40, align: "center" });
        doc.text("—", colPrice, y + 8, { width: 80, align: "right" });
        doc.text("—", colTotal, y + 8, { width: 80, align: "right" });
        y += rowHeight;
      }

      y += 10;
      doc.font("Roboto-Bold").fontSize(10);
      doc.text("Subtotal", colPrice - 20, y, { width: 90, align: "right" });
      doc.text(formatInr(subtotal), colTotal, y, { width: 80, align: "right" });
      if (creditApplied > 0) {
        y += 18;
        doc.text("Credit applied", colPrice - 20, y, { width: 90, align: "right" });
        doc.text(`-${formatInr(creditApplied)}`, colTotal, y, { width: 80, align: "right" });
      }
      if (amountPaid > 0) {
        y += 18;
        doc.text("Amount paid", colPrice - 20, y, { width: 90, align: "right" });
        doc.text(`-${formatInr(amountPaid)}`, colTotal, y, { width: 80, align: "right" });
      }
      y += 18;
      doc.text("Balance due", colPrice - 20, y, { width: 90, align: "right" });
      doc.text(formatInr(balanceDue), colTotal, y, { width: 80, align: "right" });

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

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBillingCycleInvoicePdf };
