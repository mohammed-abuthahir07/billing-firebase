import jsPDF from "jspdf";

const formatMoney = (val) => {
  const num = Number(val) || 0;
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Enterprise-Grade Monthly Sales Report PDF Generator
 * Pure client-side vector PDF using jsPDF (100% Spark plan & offline compliant).
 */
export const generateMonthlyReportPDF = ({
  summary,
  products = [],
  invoices = [],
  company = {},
  reportMonth = "Current Month",
  fileName = "Monthly-Sales-Report.pdf",
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;          // 182mm

  let currentPage = 1;

  const drawFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Billing SaaS • Confidential Monthly Financial Summary • Computer Generated",
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${currentPage}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" }
    );
  };

  const drawHeaderBanner = (isSubsequentPage = false) => {
    // Header Banner
    doc.setFillColor(15, 23, 42); // Dark Slate #0f172a
    doc.rect(0, 0, pageWidth, isSubsequentPage ? 20 : 30, "F");

    // Blue accent bottom strip
    doc.setFillColor(37, 99, 235); // Blue #2563eb
    doc.rect(0, isSubsequentPage ? 19 : 28.8, pageWidth, 1.2, "F");

    // Brand Mark
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, isSubsequentPage ? 4 : 6, 8, 8, 1.8, 1.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BS", margin + 4, isSubsequentPage ? 9.5 : 11.5, { align: "center" });

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isSubsequentPage ? 11 : 14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      isSubsequentPage ? "MONTHLY SALES REPORT (Contd.)" : "MONTHLY SALES & REVENUE REPORT",
      margin + 12,
      isSubsequentPage ? 9.5 : 12
    );

    if (!isSubsequentPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(
        `Automated billing performance report • Period: ${reportMonth}`,
        margin + 12,
        17.5
      );

      // Top Right: Period Pill Badge
      const pillWidth = 52;
      const pillHeight = 14;
      const pillX = pageWidth - margin - pillWidth;
      const pillY = 7;

      doc.setFillColor(30, 41, 59); // Slate 800
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "F");
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(96, 165, 250); // Light blue
      doc.text(reportMonth.toUpperCase(), pillX + pillWidth / 2, pillY + 5.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        pillX + pillWidth / 2,
        pillY + 10.5,
        { align: "center" }
      );
    }
  };

  // 1. Initial Page Header
  drawHeaderBanner(false);

  // 2. Business Profile Card
  let curY = 35;
  const profileCardH = 22;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, curY, contentWidth, profileCardH, 2.5, 2.5, "FD");

  // Company Info (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(37, 99, 235);
  doc.text("REPORT PREPARED FOR", margin + 5, curY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const compName = company.name || company.companyName || "Business Owner";
  doc.text(compName, margin + 5, curY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const emailText = company.email || company.alternateEmail || "";
  const phoneText = company.mobile ? ` • Tel: ${company.mobile}` : "";
  doc.text(`${emailText}${phoneText}`, margin + 5, curY + 16);

  // Business Meta (Right)
  const rightColX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ACCOUNT STATUS:", rightColX, curY + 5);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text("VERIFIED ACTIVE", rightColX + 28, curY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const gstText = company.gstNumber ? `GSTIN: ${company.gstNumber}` : "GSTIN: Unregistered";
  doc.text(gstText, rightColX, curY + 11);

  const locText = [company.city, company.state, company.country].filter(Boolean).join(", ");
  doc.text(locText ? `Location: ${locText}` : "Currency: INR (₹)", rightColX, curY + 16);

  curY += profileCardH + 6;

  // 3. Executive KPI Summary Cards
  const kpiCardWidth = (contentWidth - 9) / 4; // 4 cards with 3mm gap
  const kpiCardHeight = 22;

  const kpis = [
    {
      label: "TOTAL REVENUE",
      value: formatMoney(summary?.totalRevenue || 0),
      hint: "Gross monthly sales",
      color: [37, 99, 235], // Blue
      bg: [239, 246, 255],
    },
    {
      label: "TOTAL INVOICES",
      value: String(summary?.totalInvoices || 0),
      hint: "Bills generated",
      color: [99, 102, 241], // Indigo
      bg: [238, 242, 255],
    },
    {
      label: "TOTAL GST",
      value: formatMoney(summary?.totalGst || 0),
      hint: "Tax component",
      color: [5, 150, 105], // Emerald
      bg: [236, 253, 245],
    },
    {
      label: "AVG INVOICE",
      value: formatMoney(summary?.averageInvoiceValue || 0),
      hint: "Average bill size",
      color: [217, 119, 6], // Amber
      bg: [255, 251, 235],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (kpiCardWidth + 3);
    // Background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, curY, kpiCardWidth, kpiCardHeight, 2, 2, "FD");

    // Top color strip
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cardX, curY, kpiCardWidth, 1.8, 1, 1, "F");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 3.5, curY + 6.5);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, cardX + 3.5, curY + 13.5);

    // Hint
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.hint, cardX + 3.5, curY + 18.5);
  });

  curY += kpiCardHeight + 8;

  // 4. Product Sales Performance Table
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PRODUCT SALES PERFORMANCE", margin + 6, curY + 4.5);

  curY += 7;

  // Table Column Positions
  const colIndex = margin + 3;
  const colName = margin + 11;
  const colQty = margin + 110;
  const colRev = margin + 148;
  const colPct = pageWidth - margin - 4;

  // Table Header
  const tableHeaderH = 7.5;
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, curY, contentWidth, tableHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", colIndex, curY + 5);
  doc.text("PRODUCT / VARIANT NAME", colName, curY + 5);
  doc.text("QTY SOLD", colQty, curY + 5, { align: "right" });
  doc.text("REVENUE (INR)", colRev, curY + 5, { align: "right" });
  doc.text("SHARE", colPct, curY + 5, { align: "right" });

  curY += tableHeaderH;

  const totalRevAll = Number(summary?.totalRevenue) || 0;
  let totalQtySum = 0;
  let totalRevSum = 0;

  if (products.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 10, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No product sales recorded for this month.", margin + 5, curY + 6.5);
    curY += 10;
  } else {
    products.forEach((prod, idx) => {
      // Page break check
      if (curY > pageHeight - 32) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        // Redraw table header on new page
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, tableHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("#", colIndex, curY + 5);
        doc.text("PRODUCT / VARIANT NAME", colName, curY + 5);
        doc.text("QTY SOLD", colQty, curY + 5, { align: "right" });
        doc.text("REVENUE (INR)", colRev, curY + 5, { align: "right" });
        doc.text("SHARE", colPct, curY + 5, { align: "right" });
        curY += tableHeaderH;
      }

      const rowH = 7.5;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      const qty = Number(prod.quantitySold) || 0;
      const rev = Number(prod.revenueGenerated) || 0;
      totalQtySum += qty;
      totalRevSum += rev;
      const pct = totalRevAll > 0 ? ((rev / totalRevAll) * 100).toFixed(1) : "0.0";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), colIndex, curY + 5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const prodName = prod.productName.length > 45 ? `${prod.productName.substring(0, 42)}...` : prod.productName;
      doc.text(prodName, colName, curY + 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`${qty} packs`, colQty, curY + 5, { align: "right" });
      doc.text(formatMoney(rev), colRev, curY + 5, { align: "right" });
      doc.text(`${pct}%`, colPct, curY + 5, { align: "right" });

      curY += rowH;
    });

    // Total Row
    doc.setFillColor(239, 246, 255); // Blue 50
    doc.rect(margin, curY, contentWidth, 8, "F");
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.4);
    doc.line(margin, curY, margin + contentWidth, curY);
    doc.line(margin, curY + 8, margin + contentWidth, curY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138); // Blue 900
    doc.text("TOTAL PRODUCTS SUMMARY", colName, curY + 5.5);
    doc.text(`${totalQtySum} packs`, colQty, curY + 5.5, { align: "right" });
    doc.text(formatMoney(totalRevSum), colRev, curY + 5.5, { align: "right" });
    doc.text("100.0%", colPct, curY + 5.5, { align: "right" });

    curY += 12;
  }

  // 5. Monthly Transactions / Invoices Table (if available)
  if (invoices.length > 0) {
    // Check if we need a page break before starting invoices section
    if (curY > pageHeight - 50) {
      drawFooter();
      doc.addPage();
      currentPage += 1;
      drawHeaderBanner(true);
      curY = 28;
    }

    doc.setFillColor(5, 150, 105);
    doc.rect(margin, curY + 0.5, 2.5, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("ISSUED INVOICES BREAKDOWN", margin + 6, curY + 4.5);

    curY += 7;

    const invColNo = margin + 3;
    const invColCust = margin + 40;
    const invColDate = margin + 105;
    const invColItems = margin + 142;
    const invColTotal = pageWidth - margin - 4;

    doc.setFillColor(51, 65, 85); // Slate 700
    doc.rect(margin, curY, contentWidth, tableHeaderH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE #", invColNo, curY + 5);
    doc.text("CUSTOMER NAME", invColCust, curY + 5);
    doc.text("DATE", invColDate, curY + 5);
    doc.text("ITEMS", invColItems, curY + 5, { align: "right" });
    doc.text("AMOUNT (INR)", invColTotal, curY + 5, { align: "right" });

    curY += tableHeaderH;

    invoices.forEach((inv, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(51, 65, 85);
        doc.rect(margin, curY, contentWidth, tableHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("INVOICE #", invColNo, curY + 5);
        doc.text("CUSTOMER NAME", invColCust, curY + 5);
        doc.text("DATE", invColDate, curY + 5);
        doc.text("ITEMS", invColItems, curY + 5, { align: "right" });
        doc.text("AMOUNT (INR)", invColTotal, curY + 5, { align: "right" });
        curY += tableHeaderH;
      }

      const rowH = 7.5;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      doc.text(inv.invoiceNumber || inv.invoice_number || `INV-${idx + 1}`, invColNo, curY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const cust = inv.customerName || inv.customer_name || "Customer";
      doc.text(cust.length > 32 ? `${cust.substring(0, 30)}...` : cust, invColCust, curY + 5);

      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(inv.invoiceDate || inv.created_at), invColDate, curY + 5);

      doc.text(String(inv.itemsCount || 1), invColItems, curY + 5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(formatMoney(inv.totalAmount || inv.grand_total || 0), invColTotal, curY + 5, { align: "right" });

      curY += rowH;
    });
  }

  // Draw footer on final page
  drawFooter();

  // Save the PDF directly
  doc.save(fileName);
  return { success: true, fileName };
};
