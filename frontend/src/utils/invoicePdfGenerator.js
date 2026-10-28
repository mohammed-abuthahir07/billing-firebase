import jsPDF from "jspdf";

const fmt = (val) => `Rs. ${Number(val || 0).toFixed(2)}`;

/**
 * Robust, direct vector jsPDF generator.
 * Works 100% reliably across all mobile and desktop browsers
 * without depending on html2canvas DOM capturing or CORS issues.
 */
export const generateInvoicePDF = (invoice) => {
  if (!invoice) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner
  doc.setFillColor(37, 99, 235); // Royal Blue #2563eb
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Billing SaaS", margin, 18);

  doc.setFontSize(14);
  doc.text("TAX INVOICE", pageWidth - margin, 18, { align: "right" });

  // Invoice Metadata
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  const metaStartY = 38;
  doc.text(`Invoice No: ${invoice.invoice_number || invoice.invoiceNumber || "INV-" + Date.now()}`, margin, metaStartY);
  doc.text(
    `Date: ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}`,
    pageWidth - margin,
    metaStartY,
    { align: "right" }
  );

  // Seller & Buyer Details
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, metaStartY + 4, pageWidth - margin, metaStartY + 4);

  let detailsY = metaStartY + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SELLER DETAILS", margin, detailsY);
  doc.text("BILLED TO", pageWidth / 2 + 5, detailsY);

  detailsY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const sellerName = invoice.seller_name || invoice.sellerName || "Business Owner";
  const sellerEmail = invoice.seller_email || invoice.sellerEmail || "";
  const sellerGst = invoice.seller_gst || invoice.sellerGST || "";

  const customerName = invoice.customer_name || invoice.customerName || "Walk-in Customer";
  const customerEmail = invoice.customer_email || invoice.customerEmail || "";
  const customerAddress = invoice.customer_address || invoice.customerAddress || "";
  const customerGst = invoice.customer_gst || invoice.customerGST || "";

  doc.text(sellerName, margin, detailsY);
  doc.text(customerName, pageWidth / 2 + 5, detailsY);

  detailsY += 5;
  if (sellerEmail) doc.text(sellerEmail, margin, detailsY);
  if (customerEmail) doc.text(customerEmail, pageWidth / 2 + 5, detailsY);

  detailsY += 5;
  if (sellerGst) doc.text(`GSTIN: ${sellerGst}`, margin, detailsY);
  if (customerGst) doc.text(`GSTIN: ${customerGst}`, pageWidth / 2 + 5, detailsY);

  detailsY += 5;
  if (customerAddress) doc.text(`Address: ${customerAddress}`, pageWidth / 2 + 5, detailsY);

  // Items Table Header
  let tableY = detailsY + 12;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableY, pageWidth - margin * 2, 8, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.text("#", margin + 3, tableY + 5.5);
  doc.text("Item & Variant", margin + 12, tableY + 5.5);
  doc.text("Qty", margin + 85, tableY + 5.5, { align: "right" });
  doc.text("Price", margin + 115, tableY + 5.5, { align: "right" });
  doc.text("GST", margin + 140, tableY + 5.5, { align: "right" });
  doc.text("Total", pageWidth - margin - 3, tableY + 5.5, { align: "right" });

  tableY += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  items.forEach((item, idx) => {
    if (tableY > pageHeight - 35) {
      doc.addPage();
      tableY = 20;
    }

    const name = item.product_name || item.productName || "Product";
    const qty = String(item.quantity || 1);
    const price = fmt(item.price || item.sellingPrice || item.selling_price || 0);
    const gstRate = `${item.gst || 0}%`;
    const lineTotal = fmt(item.total || 0);

    doc.text(String(idx + 1), margin + 3, tableY);
    doc.text(name, margin + 12, tableY);
    doc.text(qty, margin + 85, tableY, { align: "right" });
    doc.text(price, margin + 115, tableY, { align: "right" });
    doc.text(gstRate, margin + 140, tableY, { align: "right" });
    doc.text(lineTotal, pageWidth - margin - 3, tableY, { align: "right" });

    tableY += 7;
  });

  // Totals Section
  tableY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, tableY, pageWidth - margin, tableY);
  tableY += 8;

  const summaryX = pageWidth - margin - 60;
  const valX = pageWidth - margin - 3;

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", summaryX, tableY);
  doc.text(fmt(invoice.subtotal || 0), valX, tableY, { align: "right" });

  tableY += 6;
  doc.text("GST Amount:", summaryX, tableY);
  doc.text(fmt(invoice.gst_amount || invoice.gst || 0), valX, tableY, { align: "right" });

  tableY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text("Grand Total:", summaryX, tableY);
  doc.text(fmt(invoice.grand_total || invoice.total || 0), valX, tableY, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for your business! Generated by Billing SaaS.", margin, pageHeight - 10);

  const fileName = `Invoice-${invoice.invoice_number || invoice.invoiceNumber || "Bill"}.pdf`;
  doc.save(fileName);
  return { success: true, fileName };
};
