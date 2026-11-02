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
 * Draw Company Information Block (Reusable for Monthly, Yearly, Total)
 */
const drawCompanyCard = (doc, { company, startY, margin, contentWidth, pageWidth, extraLabel, extraVal }) => {
  const profileCardH = 24;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, startY, contentWidth, profileCardH, 2.5, 2.5, "FD");

  // Draw logo if valid base64 image
  let textLeft = margin + 5;
  if (company?.profileImage && typeof company.profileImage === "string" && company.profileImage.startsWith("data:image")) {
    try {
      doc.addImage(company.profileImage, "JPEG", margin + 3.5, startY + 3.5, 17, 17);
      textLeft = margin + 24;
    } catch (_) {}
  }

  // Company Name & Contact (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(37, 99, 235);
  doc.text("REPORT PREPARED FOR", textLeft, startY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const compName = company.name || company.companyName || "Business Owner";
  const truncatedComp = compName.length > 34 ? `${compName.substring(0, 32)}...` : compName;
  doc.text(truncatedComp, textLeft, startY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const emailText = company.email || company.alternateEmail || "";
  const phoneText = company.mobile ? ` • Tel: ${company.mobile}` : "";
  doc.text(`${emailText}${phoneText}`, textLeft, startY + 15.5);

  const locText = [company.city, company.state, company.country].filter(Boolean).join(", ");
  doc.text(locText ? `Address: ${locText}` : "Registered Business Profile", textLeft, startY + 20);

  // Business Meta (Right)
  const rightColX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ACCOUNT STATUS:", rightColX, startY + 5);
  doc.setTextColor(5, 150, 105);
  doc.text("VERIFIED ACTIVE", rightColX + 28, startY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const gstText = company.gstNumber ? `GSTIN: ${company.gstNumber}` : "GSTIN: Unregistered";
  doc.text(gstText, rightColX, startY + 10.5);

  if (extraLabel && extraVal) {
    doc.text(`${extraLabel}: ${extraVal}`, rightColX, startY + 15.5);
  } else {
    doc.text(`Currency: INR (₹) • System: Automated`, rightColX, startY + 15.5);
  }
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`, rightColX, startY + 20);

  return profileCardH;
};

/**
 * Enterprise-Grade Monthly Sales Report PDF Generator
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

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
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, isSubsequentPage ? 20 : 30, "F");

    doc.setFillColor(37, 99, 235);
    doc.rect(0, isSubsequentPage ? 19 : 28.8, pageWidth, 1.2, "F");

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, isSubsequentPage ? 4 : 6, 8, 8, 1.8, 1.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BS", margin + 4, isSubsequentPage ? 9.5 : 11.5, { align: "center" });

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
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Automated billing performance report • Period: ${reportMonth}`,
        margin + 12,
        17.5
      );

      const pillWidth = 52;
      const pillHeight = 14;
      const pillX = pageWidth - margin - pillWidth;
      const pillY = 7;

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "F");
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(96, 165, 250);
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

  drawHeaderBanner(false);

  let curY = 35;
  const cardH = drawCompanyCard(doc, { company, startY: curY, margin, contentWidth, pageWidth });
  curY += cardH + 6;

  // KPI Cards
  const kpiCardWidth = (contentWidth - 9) / 4;
  const kpiCardHeight = 22;

  const kpis = [
    { label: "TOTAL REVENUE", value: formatMoney(summary?.totalRevenue || 0), hint: "Gross monthly sales", color: [37, 99, 235] },
    { label: "TOTAL INVOICES", value: String(summary?.totalInvoices || 0), hint: "Bills generated", color: [99, 102, 241] },
    { label: "TOTAL GST", value: formatMoney(summary?.totalGst || 0), hint: "Tax component", color: [5, 150, 105] },
    { label: "AVG INVOICE", value: formatMoney(summary?.averageInvoiceValue || 0), hint: "Average bill size", color: [217, 119, 6] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (kpiCardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, curY, kpiCardWidth, kpiCardHeight, 2, 2, "FD");

    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cardX, curY, kpiCardWidth, 1.8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 3.5, curY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, cardX + 3.5, curY + 13.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.hint, cardX + 3.5, curY + 18.5);
  });

  curY += kpiCardHeight + 8;

  // Product Sales Performance Table
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PRODUCT SALES PERFORMANCE", margin + 6, curY + 4.5);

  curY += 7;

  const colIndex = margin + 3;
  const colName = margin + 11;
  const colQty = margin + 110;
  const colRev = margin + 148;
  const colPct = pageWidth - margin - 4;

  const tableHeaderH = 7.5;
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

  const totalRevAll = Number(summary?.totalRevenue) || 0;

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
      if (curY > pageHeight - 32) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

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

      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(rev), colRev, curY + 5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${pct}%`, colPct, curY + 5, { align: "right" });

      curY += rowH;
    });
  }

  // Monthly Invoices Section
  curY += 8;
  if (curY > pageHeight - 40) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`MONTHLY ISSUED BILLS (${invoices.length} INVOICES)`, margin + 6, curY + 4.5);

  curY += 7;

  const invColNo = margin + 3;
  const invColCust = margin + 45;
  const invColDate = margin + 105;
  const invColItems = margin + 140;
  const invColTotal = pageWidth - margin - 4;

  const invHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, invHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE #", invColNo, curY + 5);
  doc.text("CUSTOMER NAME", invColCust, curY + 5);
  doc.text("DATE", invColDate, curY + 5);
  doc.text("ITEMS", invColItems, curY + 5, { align: "right" });
  doc.text("TOTAL AMOUNT", invColTotal, curY + 5, { align: "right" });

  curY += invHeaderH;

  if (invoices.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 10, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No invoices issued during this calendar month.", margin + 5, curY + 6.5);
    curY += 10;
  } else {
    invoices.forEach((inv, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, invHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("INVOICE #", invColNo, curY + 5);
        doc.text("CUSTOMER NAME", invColCust, curY + 5);
        doc.text("DATE", invColDate, curY + 5);
        doc.text("ITEMS", invColItems, curY + 5, { align: "right" });
        doc.text("TOTAL AMOUNT", invColTotal, curY + 5, { align: "right" });
        curY += invHeaderH;
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

  drawFooter();
  doc.save(fileName);
  return { success: true, fileName };
};

/**
 * Enterprise-Grade YEARLY Business Report PDF Generator
 */
export const generateYearlyReportPDF = ({
  year,
  company = {},
  summary = {},
  monthlyBreakdown = [],
  products = [],
  customers = [],
  invoices = [],
  fileName = `Yearly-Sales-Report-${year}.pdf`,
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentPage = 1;

  const drawFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Billing SaaS • Confidential Yearly Financial Summary • Calendar Year ${year}`,
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  };

  const drawHeaderBanner = (isSubsequentPage = false) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, isSubsequentPage ? 20 : 30, "F");

    doc.setFillColor(37, 99, 235);
    doc.rect(0, isSubsequentPage ? 19 : 28.8, pageWidth, 1.2, "F");

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, isSubsequentPage ? 4 : 6, 8, 8, 1.8, 1.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BS", margin + 4, isSubsequentPage ? 9.5 : 11.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isSubsequentPage ? 11 : 14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      isSubsequentPage ? `YEARLY BUSINESS REPORT (Contd.)` : `ANNUAL BUSINESS & REVENUE REPORT`,
      margin + 12,
      isSubsequentPage ? 9.5 : 12
    );

    if (!isSubsequentPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Comprehensive 12-Month Performance Audit • Calendar Year ${year}`,
        margin + 12,
        17.5
      );

      const pillWidth = 48;
      const pillHeight = 14;
      const pillX = pageWidth - margin - pillWidth;
      const pillY = 7;

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "F");
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(96, 165, 250);
      doc.text(`YEAR ${year}`, pillX + pillWidth / 2, pillY + 5.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Jan 01 - Dec 31, ${year}`, pillX + pillWidth / 2, pillY + 10.5, { align: "center" });
    }
  };

  drawHeaderBanner(false);

  let curY = 35;
  const cardH = drawCompanyCard(doc, {
    company,
    startY: curY,
    margin,
    contentWidth,
    pageWidth,
    extraLabel: "PERIOD",
    extraVal: `Jan 01 - Dec 31, ${year}`,
  });
  curY += cardH + 6;

  // Executive KPI Summary Cards
  const kpiCardWidth = (contentWidth - 9) / 4;
  const kpiCardHeight = 22;

  const kpis = [
    { label: "YEARLY REVENUE", value: formatMoney(summary.totalRevenue || 0), hint: `Total sales in ${year}`, color: [37, 99, 235] },
    { label: "TOTAL INVOICES", value: String(summary.totalInvoices || 0), hint: "Completed bills", color: [99, 102, 241] },
    { label: "YEARLY GST", value: formatMoney(summary.totalGst || 0), hint: "Tax collected", color: [5, 150, 105] },
    { label: "AVG INVOICE", value: formatMoney(summary.averageInvoiceValue || 0), hint: "Average bill size", color: [217, 119, 6] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (kpiCardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, curY, kpiCardWidth, kpiCardHeight, 2, 2, "FD");

    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cardX, curY, kpiCardWidth, 1.8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 3.5, curY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, cardX + 3.5, curY + 13.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.hint, cardX + 3.5, curY + 18.5);
  });

  curY += kpiCardHeight + 5;

  // Best Selling Product & Top Customer highlight boxes
  const highlightW = (contentWidth - 4) / 2;
  const highlightH = 14;

  // Best product box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, highlightW, highlightH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(37, 99, 235);
  doc.text("BEST SELLING PRODUCT", margin + 4, curY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const bestProd = summary.bestSellingProduct?.productName || "No sales this year";
  doc.text(bestProd.length > 36 ? `${bestProd.substring(0, 34)}...` : bestProd, margin + 4, curY + 10);

  // Top customer box
  const topCustX = margin + highlightW + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(topCustX, curY, highlightW, highlightH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(5, 150, 105);
  doc.text("TOP VALUE CUSTOMER", topCustX + 4, curY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const topCust = summary.topCustomer ? `${summary.topCustomer.customerName} (${formatMoney(summary.topCustomer.totalSpent)})` : "No customers yet";
  doc.text(topCust.length > 36 ? `${topCust.substring(0, 34)}...` : topCust, topCustX + 4, curY + 10);

  curY += highlightH + 8;

  // 12-Month Performance Table
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`12-MONTH FINANCIAL BREAKDOWN (${year})`, margin + 6, curY + 4.5);

  curY += 7;

  const mColMonth = margin + 4;
  const mColInvoices = margin + 55;
  const mColSales = margin + 85;
  const mColSubtotal = margin + 118;
  const mColGst = margin + 150;
  const mColTotal = pageWidth - margin - 4;

  const mHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, mHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("MONTH", mColMonth, curY + 5);
  doc.text("INVOICES", mColInvoices, curY + 5, { align: "right" });
  doc.text("SALES COUNT", mColSales, curY + 5, { align: "right" });
  doc.text("SUBTOTAL (INR)", mColSubtotal, curY + 5, { align: "right" });
  doc.text("GST AMOUNT", mColGst, curY + 5, { align: "right" });
  doc.text("TOTAL REVENUE", mColTotal, curY + 5, { align: "right" });

  curY += mHeaderH;

  monthlyBreakdown.forEach((m, idx) => {
    const rowH = 6.8;
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, curY, contentWidth, rowH, "F");

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

    doc.setFont("helvetica", m.totalInvoices > 0 ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(m.totalInvoices > 0 ? 15 : 148, m.totalInvoices > 0 ? 23 : 163, m.totalInvoices > 0 ? 42 : 184);
    doc.text(m.monthName, mColMonth, curY + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(String(m.totalInvoices || 0), mColInvoices, curY + 4.5, { align: "right" });
    doc.text(String(m.totalSales || 0), mColSales, curY + 4.5, { align: "right" });
    doc.text(formatMoney(m.totalSubtotal || 0), mColSubtotal, curY + 4.5, { align: "right" });
    doc.text(formatMoney(m.gstAmount || 0), mColGst, curY + 4.5, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(m.totalRevenue > 0 ? 37 : 148, m.totalRevenue > 0 ? 99 : 163, m.totalRevenue > 0 ? 235 : 184);
    doc.text(formatMoney(m.totalRevenue || 0), mColTotal, curY + 4.5, { align: "right" });

    curY += rowH;
  });

  // Section 5: Product Performance Ranking
  curY += 8;
  if (curY > pageHeight - 45) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ANNUAL PRODUCT PERFORMANCE RANKING (${products.length} PRODUCTS)`, margin + 6, curY + 4.5);

  curY += 7;

  const pColRank = margin + 3;
  const pColName = margin + 12;
  const pColQty = margin + 115;
  const pColRev = margin + 155;
  const pColShare = pageWidth - margin - 4;

  const pHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, pHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", pColRank, curY + 5);
  doc.text("PRODUCT / VARIANT NAME", pColName, curY + 5);
  doc.text("QTY SOLD", pColQty, curY + 5, { align: "right" });
  doc.text("TOTAL REVENUE", pColRev, curY + 5, { align: "right" });
  doc.text("SHARE %", pColShare, curY + 5, { align: "right" });

  curY += pHeaderH;

  const totalRevYear = Number(summary.totalRevenue) || 0;

  if (products.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 9, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No products sold in this calendar year.", margin + 5, curY + 6);
    curY += 9;
  } else {
    products.forEach((prod, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, pHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("#", pColRank, curY + 5);
        doc.text("PRODUCT / VARIANT NAME", pColName, curY + 5);
        doc.text("QTY SOLD", pColQty, curY + 5, { align: "right" });
        doc.text("TOTAL REVENUE", pColRev, curY + 5, { align: "right" });
        doc.text("SHARE %", pColShare, curY + 5, { align: "right" });
        curY += pHeaderH;
      }

      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      const qty = Number(prod.quantitySold) || 0;
      const rev = Number(prod.revenueGenerated) || 0;
      const pct = totalRevYear > 0 ? ((rev / totalRevYear) * 100).toFixed(1) : "0.0";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), pColRank, curY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const pName = prod.productName.length > 45 ? `${prod.productName.substring(0, 43)}...` : prod.productName;
      doc.text(pName, pColName, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`${qty} packs`, pColQty, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(rev), pColRev, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${pct}%`, pColShare, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  // Section 6: Customer Performance
  curY += 8;
  if (curY > pageHeight - 45) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOP CUSTOMERS (${customers.length} REGISTERED BUYERS)`, margin + 6, curY + 4.5);

  curY += 7;

  const cColRank = margin + 3;
  const cColName = margin + 12;
  const cColInvoices = margin + 120;
  const cColTotal = pageWidth - margin - 4;

  const cHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, cHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", cColRank, curY + 5);
  doc.text("CUSTOMER NAME", cColName, curY + 5);
  doc.text("INVOICES COMPLETED", cColInvoices, curY + 5, { align: "right" });
  doc.text("TOTAL PURCHASE (INR)", cColTotal, curY + 5, { align: "right" });

  curY += cHeaderH;

  if (customers.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 9, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No customer records found for this year.", margin + 5, curY + 6);
    curY += 9;
  } else {
    customers.slice(0, 15).forEach((cust, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, cHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("#", cColRank, curY + 5);
        doc.text("CUSTOMER NAME", cColName, curY + 5);
        doc.text("INVOICES COMPLETED", cColInvoices, curY + 5, { align: "right" });
        doc.text("TOTAL PURCHASE (INR)", cColTotal, curY + 5, { align: "right" });
        curY += cHeaderH;
      }

      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), cColRank, curY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(cust.customerName, cColName, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`${cust.invoiceCount} bills`, cColInvoices, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(cust.totalSpent), cColTotal, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  // Section 7: Complete Yearly Invoices
  curY += 8;
  if (curY > pageHeight - 45) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`COMPLETE YEARLY INVOICE AUDIT (${invoices.length} INVOICES)`, margin + 6, curY + 4.5);

  curY += 7;

  const invColNo = margin + 3;
  const invColCust = margin + 42;
  const invColDate = margin + 98;
  const invColSub = margin + 125;
  const invColGst = margin + 152;
  const invColTotal = pageWidth - margin - 4;

  const invH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, invH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE #", invColNo, curY + 5);
  doc.text("CUSTOMER", invColCust, curY + 5);
  doc.text("DATE", invColDate, curY + 5);
  doc.text("SUBTOTAL", invColSub, curY + 5, { align: "right" });
  doc.text("GST", invColGst, curY + 5, { align: "right" });
  doc.text("GRAND TOTAL", invColTotal, curY + 5, { align: "right" });

  curY += invH;

  if (invoices.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 9, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No invoices recorded for this year.", margin + 5, curY + 6);
    curY += 9;
  } else {
    invoices.forEach((inv, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, invH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("INVOICE #", invColNo, curY + 5);
        doc.text("CUSTOMER", invColCust, curY + 5);
        doc.text("DATE", invColDate, curY + 5);
        doc.text("SUBTOTAL", invColSub, curY + 5, { align: "right" });
        doc.text("GST", invColGst, curY + 5, { align: "right" });
        doc.text("GRAND TOTAL", invColTotal, curY + 5, { align: "right" });
        curY += invH;
      }

      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      doc.text(inv.invoiceNumber || inv.invoice_number || `INV-${idx + 1}`, invColNo, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const cust = inv.customerName || inv.customer_name || "Customer";
      doc.text(cust.length > 25 ? `${cust.substring(0, 23)}...` : cust, invColCust, curY + 4.5);

      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(inv.invoiceDate || inv.created_at), invColDate, curY + 4.5);

      doc.text(formatMoney(inv.subtotal || 0), invColSub, curY + 4.5, { align: "right" });
      doc.text(formatMoney(inv.gst_amount || inv.gst || 0), invColGst, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(formatMoney(inv.totalAmount || inv.grand_total || 0), invColTotal, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  drawFooter();
  doc.save(fileName);
  return { success: true, fileName };
};

/**
 * Enterprise-Grade TOTAL / LIFETIME Business Report PDF Generator
 */
export const generateTotalReportPDF = ({
  company = {},
  summary = {},
  yearlyBreakdown = [],
  monthlyBreakdown = [],
  products = [],
  customers = [],
  inventory = {},
  invoices = [],
  period = "All Time",
  accountCreatedAt = "Active",
  fileName = "Complete-Business-Report.pdf",
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentPage = 1;

  const drawFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Billing SaaS • Complete Lifetime Audit Report • All-Time Business History`,
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  };

  const drawHeaderBanner = (isSubsequentPage = false) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, isSubsequentPage ? 20 : 30, "F");

    doc.setFillColor(37, 99, 235);
    doc.rect(0, isSubsequentPage ? 19 : 28.8, pageWidth, 1.2, "F");

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin, isSubsequentPage ? 4 : 6, 8, 8, 1.8, 1.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BS", margin + 4, isSubsequentPage ? 9.5 : 11.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isSubsequentPage ? 11 : 14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      isSubsequentPage ? "COMPLETE BUSINESS REPORT (Contd.)" : "COMPLETE BUSINESS & LIFETIME REPORT",
      margin + 12,
      isSubsequentPage ? 9.5 : 12
    );

    if (!isSubsequentPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Full historical performance audit • Reporting Period: ${period}`,
        margin + 12,
        17.5
      );

      const pillWidth = 50;
      const pillHeight = 14;
      const pillX = pageWidth - margin - pillWidth;
      const pillY = 7;

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "F");
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 2, 2, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(96, 165, 250);
      doc.text("LIFETIME AUDIT", pillX + pillWidth / 2, pillY + 5.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Active Since: ${accountCreatedAt}`, pillX + pillWidth / 2, pillY + 10.5, { align: "center" });
    }
  };

  drawHeaderBanner(false);

  let curY = 35;
  const cardH = drawCompanyCard(doc, {
    company,
    startY: curY,
    margin,
    contentWidth,
    pageWidth,
    extraLabel: "RECORD SPAN",
    extraVal: period,
  });
  curY += cardH + 6;

  // Lifetime Executive KPI Cards
  const kpiCardWidth = (contentWidth - 9) / 4;
  const kpiCardHeight = 22;

  const kpis = [
    { label: "LIFETIME REVENUE", value: formatMoney(summary.totalRevenue || 0), hint: "All-time recorded turnover", color: [37, 99, 235] },
    { label: "LIFETIME BILLS", value: String(summary.totalInvoices || 0), hint: "Total issued invoices", color: [99, 102, 241] },
    { label: "TOTAL GST", value: formatMoney(summary.totalGst || 0), hint: "Lifetime tax collected", color: [5, 150, 105] },
    { label: "OVERALL AVG BILL", value: formatMoney(summary.averageInvoiceValue || 0), hint: "Cumulative average", color: [217, 119, 6] },
  ];

  kpis.forEach((kpi, idx) => {
    const cardX = margin + idx * (kpiCardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, curY, kpiCardWidth, kpiCardHeight, 2, 2, "FD");

    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(cardX, curY, kpiCardWidth, 1.8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 3.5, curY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, cardX + 3.5, curY + 13.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.hint, cardX + 3.5, curY + 18.5);
  });

  curY += kpiCardHeight + 5;

  // Best Product & Top Customer highlight boxes
  const highlightW = (contentWidth - 4) / 2;
  const highlightH = 14;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, highlightW, highlightH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(37, 99, 235);
  doc.text("ALL-TIME BEST SELLING PRODUCT", margin + 4, curY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const bestProd = summary.bestSellingProduct?.productName || "No sales recorded";
  doc.text(bestProd.length > 36 ? `${bestProd.substring(0, 34)}...` : bestProd, margin + 4, curY + 10);

  const topCustX = margin + highlightW + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(topCustX, curY, highlightW, highlightH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(5, 150, 105);
  doc.text("ALL-TIME TOP VALUE CUSTOMER", topCustX + 4, curY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const topCust = summary.topCustomer ? `${summary.topCustomer.customerName} (${formatMoney(summary.topCustomer.totalSpent)})` : "No customers yet";
  doc.text(topCust.length > 36 ? `${topCust.substring(0, 34)}...` : topCust, topCustX + 4, curY + 10);

  curY += highlightH + 8;

  // Section 8: CURRENT INVENTORY STATUS
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("CURRENT INVENTORY STATUS (LIVE SNAPSHOT)", margin + 6, curY + 4.5);

  curY += 7;

  const invSummaryW = (contentWidth - 9) / 4;
  const invSummaryH = 16;
  const invCards = [
    { label: "CATALOG ITEMS", val: `${inventory.totalProducts || 0} Listed`, color: [30, 41, 59] },
    { label: "AVAILABLE STOCK", val: `${inventory.totalStockUnits || 0} Units`, color: [37, 99, 235] },
    { label: "LOW STOCK ITEMS", val: `${inventory.lowStockCount || 0} Alert`, color: [217, 119, 6] },
    { label: "OUT OF STOCK", val: `${inventory.outOfStockCount || 0} Depleted`, color: [220, 38, 38] },
  ];

  invCards.forEach((c, idx) => {
    const cX = margin + idx * (invSummaryW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cX, curY, invSummaryW, invSummaryH, 1.8, 1.8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cX + 3, curY + 5.5);

    doc.setFontSize(9);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, cX + 3, curY + 11.5);
  });

  curY += invSummaryH + 8;

  // Section 4: Year-by-Year Performance Table
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("HISTORICAL YEAR-BY-YEAR PERFORMANCE", margin + 6, curY + 4.5);

  curY += 7;

  const yColYear = margin + 4;
  const yColInvoices = margin + 50;
  const yColSales = margin + 85;
  const yColGst = margin + 125;
  const yColRevenue = pageWidth - margin - 4;

  const yHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, yHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("YEAR", yColYear, curY + 5);
  doc.text("INVOICES", yColInvoices, curY + 5, { align: "right" });
  doc.text("SALES COUNT", yColSales, curY + 5, { align: "right" });
  doc.text("GST COLLECTED", yColGst, curY + 5, { align: "right" });
  doc.text("ANNUAL REVENUE", yColRevenue, curY + 5, { align: "right" });

  curY += yHeaderH;

  if (yearlyBreakdown.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 8, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No historical annual records found.", margin + 5, curY + 5.5);
    curY += 8;
  } else {
    yearlyBreakdown.forEach((yb, idx) => {
      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Year ${yb.year}`, yColYear, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(String(yb.totalInvoices || 0), yColInvoices, curY + 4.5, { align: "right" });
      doc.text(String(yb.totalSales || 0), yColSales, curY + 4.5, { align: "right" });
      doc.text(formatMoney(yb.gstAmount || 0), yColGst, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(formatMoney(yb.totalRevenue || 0), yColRevenue, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  // Section 6: Lifetime Product Performance
  curY += 8;
  if (curY > pageHeight - 45) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`LIFETIME PRODUCT SALES PERFORMANCE (${products.length} PRODUCTS)`, margin + 6, curY + 4.5);

  curY += 7;

  const pColRank = margin + 3;
  const pColName = margin + 12;
  const pColQty = margin + 115;
  const pColRev = margin + 155;
  const pColShare = pageWidth - margin - 4;

  const pHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, pHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", pColRank, curY + 5);
  doc.text("PRODUCT / VARIANT NAME", pColName, curY + 5);
  doc.text("QTY SOLD", pColQty, curY + 5, { align: "right" });
  doc.text("TOTAL REVENUE", pColRev, curY + 5, { align: "right" });
  doc.text("SHARE %", pColShare, curY + 5, { align: "right" });

  curY += pHeaderH;

  const totalRevLife = Number(summary.totalRevenue) || 0;

  if (products.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 8, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No product sales recorded in history.", margin + 5, curY + 5.5);
    curY += 8;
  } else {
    products.forEach((prod, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, pHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("#", pColRank, curY + 5);
        doc.text("PRODUCT / VARIANT NAME", pColName, curY + 5);
        doc.text("QTY SOLD", pColQty, curY + 5, { align: "right" });
        doc.text("TOTAL REVENUE", pColRev, curY + 5, { align: "right" });
        doc.text("SHARE %", pColShare, curY + 5, { align: "right" });
        curY += pHeaderH;
      }

      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      const qty = Number(prod.quantitySold) || 0;
      const rev = Number(prod.revenueGenerated) || 0;
      const pct = totalRevLife > 0 ? ((rev / totalRevLife) * 100).toFixed(1) : "0.0";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), pColRank, curY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const pName = prod.productName.length > 45 ? `${prod.productName.substring(0, 43)}...` : prod.productName;
      doc.text(pName, pColName, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`${qty} packs`, pColQty, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(rev), pColRev, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${pct}%`, pColShare, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  // Section 7: Lifetime Customer Performance
  curY += 8;
  if (curY > pageHeight - 45) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`LIFETIME TOP BUYERS (${customers.length} CUSTOMERS)`, margin + 6, curY + 4.5);

  curY += 7;

  const cColRank = margin + 3;
  const cColName = margin + 12;
  const cColInvoices = margin + 120;
  const cColTotal = pageWidth - margin - 4;

  const cHeaderH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, cHeaderH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("#", cColRank, curY + 5);
  doc.text("CUSTOMER NAME", cColName, curY + 5);
  doc.text("INVOICES COUNT", cColInvoices, curY + 5, { align: "right" });
  doc.text("LIFETIME PURCHASE", cColTotal, curY + 5, { align: "right" });

  curY += cHeaderH;

  if (customers.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 8, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No customer records found in history.", margin + 5, curY + 5.5);
    curY += 8;
  } else {
    customers.slice(0, 20).forEach((cust, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, cHeaderH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("#", cColRank, curY + 5);
        doc.text("CUSTOMER NAME", cColName, curY + 5);
        doc.text("INVOICES COUNT", cColInvoices, curY + 5, { align: "right" });
        doc.text("LIFETIME PURCHASE", cColTotal, curY + 5, { align: "right" });
        curY += cHeaderH;
      }

      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), cColRank, curY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(cust.customerName, cColName, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`${cust.invoiceCount} invoices`, cColInvoices, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(cust.totalSpent), cColTotal, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  // Section 9: Complete Historical Invoice Audit
  curY += 8;
  if (curY > pageHeight - 45) {
    drawFooter();
    doc.addPage();
    currentPage += 1;
    drawHeaderBanner(true);
    curY = 28;
  }

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, curY + 0.5, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`COMPLETE HISTORICAL INVOICE AUDIT (${invoices.length} INVOICES)`, margin + 6, curY + 4.5);

  curY += 7;

  const invColNo = margin + 3;
  const invColCust = margin + 42;
  const invColDate = margin + 98;
  const invColSub = margin + 125;
  const invColGst = margin + 152;
  const invColTotal = pageWidth - margin - 4;

  const invH = 7.5;
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, invH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE #", invColNo, curY + 5);
  doc.text("CUSTOMER", invColCust, curY + 5);
  doc.text("DATE", invColDate, curY + 5);
  doc.text("SUBTOTAL", invColSub, curY + 5, { align: "right" });
  doc.text("GST", invColGst, curY + 5, { align: "right" });
  doc.text("GRAND TOTAL", invColTotal, curY + 5, { align: "right" });

  curY += invH;

  if (invoices.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 8, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No invoices recorded in history.", margin + 5, curY + 5.5);
    curY += 8;
  } else {
    invoices.forEach((inv, idx) => {
      if (curY > pageHeight - 25) {
        drawFooter();
        doc.addPage();
        currentPage += 1;
        drawHeaderBanner(true);
        curY = 28;

        doc.setFillColor(30, 41, 59);
        doc.rect(margin, curY, contentWidth, invH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text("INVOICE #", invColNo, curY + 5);
        doc.text("CUSTOMER", invColCust, curY + 5);
        doc.text("DATE", invColDate, curY + 5);
        doc.text("SUBTOTAL", invColSub, curY + 5, { align: "right" });
        doc.text("GST", invColGst, curY + 5, { align: "right" });
        doc.text("GRAND TOTAL", invColTotal, curY + 5, { align: "right" });
        curY += invH;
      }

      const rowH = 7;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, curY, contentWidth, rowH, "F");

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      doc.text(inv.invoiceNumber || inv.invoice_number || `INV-${idx + 1}`, invColNo, curY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const cust = inv.customerName || inv.customer_name || "Customer";
      doc.text(cust.length > 25 ? `${cust.substring(0, 23)}...` : cust, invColCust, curY + 4.5);

      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(inv.invoiceDate || inv.created_at), invColDate, curY + 4.5);

      doc.text(formatMoney(inv.subtotal || 0), invColSub, curY + 4.5, { align: "right" });
      doc.text(formatMoney(inv.gst_amount || inv.gst || 0), invColGst, curY + 4.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(formatMoney(inv.totalAmount || inv.grand_total || 0), invColTotal, curY + 4.5, { align: "right" });

      curY += rowH;
    });
  }

  drawFooter();
  doc.save(fileName);
  return { success: true, fileName };
};
