import jsPDFImport from "jspdf";

const jsPDF = jsPDFImport?.jsPDF || jsPDFImport;

const fmt = (val) => `Rs. ${Number(val || 0).toFixed(2)}`;

const text = (value) => {
  const raw = String(value ?? "").trim();
  const lowered = raw.toLowerCase();
  if (!raw || lowered === "null" || lowered === "undefined" || lowered === "n/a" || raw === "—" || raw === "-") return "";
  return raw;
};

const drawWrapped = (doc, lines, x, y, width) => {
  let cursor = y;
  lines.filter(Boolean).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), width);
    doc.text(wrapped, x, cursor);
    cursor += wrapped.length * 4.2;
  });
  return cursor;
};

/**
 * Vector invoice PDF used by download and share.
 * Seller name comes from the company profile already applied to the invoice.
 */
export const generateInvoicePDF = (invoice, options = {}) => {
  if (!invoice) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const columnWidth = contentWidth / 2 - 4;
  const rightX = margin + contentWidth / 2 + 4;

  const sellerName = text(invoice.seller_name || invoice.sellerName);
  const sellerEmail = text(invoice.seller_email || invoice.sellerEmail);
  const sellerGst = text(invoice.seller_gst || invoice.sellerGST);
  const sellerPhone = text(invoice.seller_phone || invoice.sellerPhone);
  const sellerAddress = text(invoice.seller_address || invoice.sellerAddress);

  const customerName = text(invoice.customer_name || invoice.customerName) || "Walk-in Customer";
  const customerEmail = text(invoice.customer_email || invoice.customerEmail);
  const customerAddress = text(invoice.customer_address || invoice.customerAddress);
  const customerGst = text(invoice.customer_gst || invoice.customerGST);
  const customerPhone = text(invoice.customer_phone || invoice.customerPhone);

  const invoiceNo = text(invoice.invoice_number || invoice.invoiceNumber) || "Invoice";
  const invoiceDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString("en-IN")
    : new Date().toLocaleDateString("en-IN");

  doc.setFont("helvetica", "bold");
  const nameWidth = contentWidth - 52;
  let nameSize = 16;
  let nameLines = sellerName ? doc.splitTextToSize(sellerName, nameWidth) : [];
  if (nameLines.length > 2) {
    nameSize = 13;
    doc.setFontSize(nameSize);
    nameLines = doc.splitTextToSize(sellerName, nameWidth);
  }
  if (nameLines.length > 3) {
    nameSize = 11;
    doc.setFontSize(nameSize);
    nameLines = doc.splitTextToSize(sellerName, nameWidth).slice(0, 4);
  }
  const headerHeight = Math.max(16, 9 + nameLines.length * (nameSize * 0.45));

  const paintHeader = () => {
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(nameSize);
    if (nameLines.length) doc.text(nameLines, margin, 10);
    doc.setFontSize(12);
    doc.text("TAX INVOICE", pageWidth - margin, headerHeight / 2 + 1.5, { align: "right" });
  };

  const paintTableHeader = (y) => {
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("#", margin + 2, y + 4.6);
    doc.text("Item & Variant", margin + 10, y + 4.6);
    doc.text("Qty", margin + 112, y + 4.6, { align: "right" });
    doc.text("Price", margin + 138, y + 4.6, { align: "right" });
    doc.text("GST", margin + 158, y + 4.6, { align: "right" });
    doc.text("Total", pageWidth - margin - 2, y + 4.6, { align: "right" });
    return y + 7;
  };

  paintHeader();

  let y = headerHeight + 6;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Invoice No: ${invoiceNo}`, margin, y);
  doc.text(`Date: ${invoiceDate}`, pageWidth - margin, y, { align: "right" });

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("SELLER DETAILS", margin, y);
  doc.text("BILLED TO", rightX, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const sellerEnd = drawWrapped(doc, [
    sellerName,
    sellerPhone,
    sellerAddress,
    sellerEmail,
    sellerGst ? `GSTIN: ${sellerGst}` : "",
  ], margin, y, columnWidth);
  const customerEnd = drawWrapped(doc, [
    customerName,
    customerEmail,
    customerPhone ? `Phone: ${customerPhone}` : "",
    customerAddress,
    customerGst ? `GSTIN: ${customerGst}` : "",
  ], rightX, y, columnWidth);

  let tableY = Math.max(sellerEnd, customerEnd) + 3;
  tableY = paintTableHeader(tableY);

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  items.forEach((item, idx) => {
    const name = text(item.product_name || item.productName) || "Product";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const wrappedName = doc.splitTextToSize(name, 90);
    const rowHeight = Math.max(6.5, wrappedName.length * 4 + 2.2);

    if (tableY + rowHeight > pageHeight - 18) {
      doc.addPage();
      paintHeader();
      tableY = paintTableHeader(headerHeight + 6);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, tableY, contentWidth, rowHeight, "F");
    }

    const textY = tableY + 4.4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), margin + 2, textY);
    doc.text(wrappedName, margin + 10, textY);
    doc.text(String(item.quantity || 1), margin + 112, textY, { align: "right" });
    doc.text(fmt(item.price || item.sellingPrice || item.selling_price || 0), margin + 138, textY, { align: "right" });
    doc.text(`${item.gst || 0}%`, margin + 158, textY, { align: "right" });
    doc.text(fmt(item.total || 0), pageWidth - margin - 2, textY, { align: "right" });
    tableY += rowHeight;
  });

  const discount = Number(invoice.discount || 0);
  if (tableY + (discount > 0 ? 34 : 28) > pageHeight - 14) {
    doc.addPage();
    paintHeader();
    tableY = headerHeight + 8;
  }

  tableY += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, tableY, pageWidth - margin, tableY);
  tableY += 6;

  const summaryX = pageWidth - margin - 58;
  const valX = pageWidth - margin - 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", summaryX, tableY);
  doc.text(fmt(invoice.subtotal || 0), valX, tableY, { align: "right" });
  tableY += 5;
  doc.text("GST Amount:", summaryX, tableY);
  doc.text(fmt(invoice.gst_amount || invoice.gst || 0), valX, tableY, { align: "right" });
  tableY += 5;
  if (discount > 0) {
    doc.text("Discount:", summaryX, tableY);
    doc.text(fmt(discount), valX, tableY, { align: "right" });
    tableY += 5;
  }
  tableY += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text("Grand Total:", summaryX, tableY);
  doc.text(fmt(invoice.grand_total || invoice.total || 0), valX, tableY, { align: "right" });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business.", margin, pageHeight - 6);
    if (pageCount > 1) {
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    }
  }

  const fileName = `Invoice-${invoiceNo}.pdf`;
  if (options.delivery === "file") {
    return new File([doc.output("blob")], fileName, { type: "application/pdf" });
  }
  if (options.delivery === "buffer") {
    return doc.output("arraybuffer");
  }
  doc.save(fileName);
  return { success: true, fileName };
};
