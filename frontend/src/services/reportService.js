import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { loadMergedRecords } from '../utils/salesHistory';
import {
  customerLabel,
  recordGrandTotal,
  recordGst,
  recordMonth,
  recordSubtotal,
  recordYear,
} from '../utils/salesMerge';
import {
  generateMonthlyReportPDF,
  generateYearlyReportPDF,
  generateTotalReportPDF,
  generateCustomRangeReportPDF,
} from '../utils/reportPdfGenerator';
import {
  buildCustomRangeReport,
  formatRangeLabel,
  validateDateRange,
} from '../utils/reportDateRange';
import { sellerFromCompany } from '../utils/companySeller';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Identify available business calendar years from authenticated user's actual invoice records.
 */
export const getAvailableReportYears = async () => {
  const user = auth.currentUser;
  const currentYear = new Date().getFullYear();
  if (!user) return [currentYear];

  try {
    const { records } = await loadMergedRecords(user.uid);
    const yearsSet = new Set();
    yearsSet.add(currentYear);

    records.forEach((data) => {
      const yr = recordYear(data);
      if (yr && !Number.isNaN(yr)) {
        yearsSet.add(yr);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  } catch (err) {
    console.warn('Could not retrieve available invoice years:', err.message);
    return [currentYear];
  }
};

/**
 * Fetch company information for reports
 */
const fetchCompanyProfile = async (user) => {
  let company = {};
  if (!user) return company;

  try {
    const profileDoc = await getDoc(doc(db, `users/${user.uid}/profile/company`));
    if (profileDoc.exists()) company = profileDoc.data();

    const userDoc = await getDoc(doc(db, `users/${user.uid}`));
    const uData = userDoc.exists() ? userDoc.data() : {};
    const seller = sellerFromCompany(company, {
      personalName: uData.name || user.displayName || '',
      authEmail: user.email || '',
    });
    company.name = seller.companyName;
    company.companyName = seller.companyName;
    company.email = seller.email;
    company.alternateEmail = seller.email;
    company.mobile = seller.phone;
    company.gstNumber = seller.gstin;
    company.addressLine = seller.address;
    company.profileImage = seller.logo || company.profileImage || '';
    company.createdAt = uData.createdAt || user.metadata?.creationTime || '';
  } catch (_) {}

  return company;
};

// ─── MONTHLY REPORT METHODS ──────────────────────────────────────────────────

export const getMonthlySummary = async (params = {}) => {
  const user = auth.currentUser;
  const now = new Date();
  const month = Number(params.month) || (now.getMonth() + 1);
  const year = Number(params.year) || now.getFullYear();
  const reportMonth = `${MONTH_NAMES[month - 1]} ${year}`;

  if (!user) {
    return {
      success: true,
      month,
      year,
      reportMonth,
      summary: {
        totalRevenue: 0,
        totalSales: 0,
        totalInvoices: 0,
        averageInvoiceValue: 0,
        totalGst: 0,
        totalSubtotal: 0,
        bestSellingProduct: null,
      },
    };
  }

  const { records, salesRecordsBlocked } = await loadMergedRecords(user.uid, { year, month });

  let totalRevenue = 0;
  let totalSubtotal = 0;
  let totalGst = 0;
  const productSalesMap = new Map();

  records.forEach((data) => {
    totalRevenue += recordGrandTotal(data);
    totalSubtotal += recordSubtotal(data);
    totalGst += recordGst(data);

    if (Array.isArray(data.items)) {
      data.items.forEach((item) => {
        const name = item.product_name || item.productName || 'Product';
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.total) || 0;
        const curr = productSalesMap.get(name) || { quantity: 0, revenue: 0 };
        productSalesMap.set(name, {
          quantity: curr.quantity + qty,
          revenue: curr.revenue + rev,
        });
      });
    }
  });

  let bestSellingProduct = null;
  let maxQty = 0;
  for (const [name, stats] of productSalesMap.entries()) {
    if (stats.quantity > maxQty) {
      maxQty = stats.quantity;
      bestSellingProduct = {
        productName: name,
        quantitySold: stats.quantity,
        revenueGenerated: Number(stats.revenue.toFixed(2)),
      };
    }
  }

  const totalInvoices = records.length;
  const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  return {
    success: true,
    month,
    year,
    reportMonth,
    summary: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalSales: totalInvoices,
      totalInvoices,
      averageInvoiceValue: Number(averageInvoiceValue.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      bestSellingProduct,
    },
    salesRecordsBlocked,
  };
};

const monthInvoiceCache = new Map();

export function clearMonthlyInvoiceCache(userId) {
  if (!userId) {
    monthInvoiceCache.clear();
    return;
  }
  for (const key of monthInvoiceCache.keys()) {
    if (key.startsWith(`${userId}|`)) monthInvoiceCache.delete(key);
  }
}

export const getMonthlyInvoices = async (params = {}) => {
  const user = auth.currentUser;
  const now = new Date();
  const month = Number(params.month) || (now.getMonth() + 1);
  const year = Number(params.year) || now.getFullYear();
  const search = (params.search || '').trim().toLowerCase();
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;
  const reportMonth = `${MONTH_NAMES[month - 1]} ${year}`;

  if (!user) {
    return {
      success: true,
      month,
      year,
      reportMonth,
      invoices: [],
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  const cacheKey = `${user.uid}|${year}|${month}`;
  let cached = monthInvoiceCache.get(cacheKey);
  if (!cached) {
    cached = await loadMergedRecords(user.uid, { year, month });
    monthInvoiceCache.set(cacheKey, cached);
  }
  const { records, salesRecordsBlocked } = cached;

  let filteredInvoices = records.map((data) => ({
    id: data.id,
    invoiceNumber: data.invoice_number || data.invoiceNumber,
    customerName: customerLabel(data, 'Customer'),
    invoiceDate: data.created_at,
    itemsCount: Array.isArray(data.items) ? data.items.length : 1,
    totalAmount: recordGrandTotal(data),
  }));

  if (search) {
    filteredInvoices = filteredInvoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(search) ||
        inv.customerName?.toLowerCase().includes(search)
    );
  }

  const total = filteredInvoices.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = filteredInvoices.slice(startIndex, startIndex + limit);

  return {
    success: true,
    month,
    year,
    reportMonth,
    invoices: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    salesRecordsBlocked,
  };
};

export const getMonthlyProducts = async (params = {}) => {
  const user = auth.currentUser;
  const now = new Date();
  const month = Number(params.month) || (now.getMonth() + 1);
  const year = Number(params.year) || now.getFullYear();
  const reportMonth = `${MONTH_NAMES[month - 1]} ${year}`;

  if (!user) {
    return { success: true, month, year, reportMonth, products: [] };
  }

  const { records } = await loadMergedRecords(user.uid, { year, month });

  const productMap = new Map();
  records.forEach((data) => {
    if (Array.isArray(data.items)) {
      data.items.forEach((item) => {
        const name = item.product_name || item.productName || 'Product';
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.total) || 0;
        const curr = productMap.get(name) || { quantitySold: 0, revenueGenerated: 0 };
        productMap.set(name, {
          productName: name,
          quantitySold: curr.quantitySold + qty,
          revenueGenerated: Number((curr.revenueGenerated + rev).toFixed(2)),
        });
      });
    }
  });

  return {
    success: true,
    month,
    year,
    reportMonth,
    products: Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold),
  };
};

export const downloadMonthlyReportPdf = async (params = {}) => {
  const summaryRes = await getMonthlySummary(params);
  const productsRes = await getMonthlyProducts(params);

  const monthName = MONTH_NAMES[(summaryRes.month || 1) - 1];
  const fileName = `Monthly-Sales-Report-${monthName}-${summaryRes.year}.pdf`;

  const user = auth.currentUser;
  let company = {};
  let invoices = [];

  if (user) {
    company = await fetchCompanyProfile(user);

    const { records } = await loadMergedRecords(user.uid, {
      year: summaryRes.year,
      month: summaryRes.month,
    });
    invoices = records.map((data) => ({
      invoiceNumber: data.invoice_number || data.invoiceNumber,
      customerName: customerLabel(data, 'Customer'),
      invoiceDate: data.created_at,
      itemsCount: Array.isArray(data.items) ? data.items.length : 1,
      totalAmount: recordGrandTotal(data),
    }));
  }

  return generateMonthlyReportPDF({
    summary: summaryRes.summary,
    products: productsRes.products,
    invoices,
    company,
    reportMonth: summaryRes.reportMonth,
    fileName,
    delivery: params.delivery || 'save',
  });
};

// ─── YEARLY REPORT DOWNLOAD ──────────────────────────────────────────────────

export const downloadYearlyReportPdf = async (selectedYear, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated.');

  const targetYear = Number(selectedYear) || new Date().getFullYear();
  const company = await fetchCompanyProfile(user);

  const { records } = await loadMergedRecords(user.uid, { year: targetYear });

  const yearlyInvoices = [];
  records.forEach((data) => {
    const yr = Number(data.year) || (data.created_at ? new Date(data.created_at).getFullYear() : null);
    if (yr === targetYear) {
      yearlyInvoices.push({
        id: data.id,
        invoiceNumber: data.invoice_number || data.invoiceNumber || `INV-${String(data.id).substring(0, 8)}`,
        customerName: customerLabel(data),
        invoiceDate: data.created_at || new Date().toISOString(),
        itemsCount: Array.isArray(data.items) ? data.items.length : 1,
        subtotal: Number(data.subtotal) || 0,
        gst_amount: Number(data.gst_amount) || 0,
        totalAmount: Number(data.grand_total) || 0,
        items: data.items || [],
        month: Number(data.month) || (data.created_at ? new Date(data.created_at).getMonth() + 1 : 1),
      });
    }
  });

  // Sort invoices by date descending
  yearlyInvoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  // Initialize 12-Month Array
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: MONTH_NAMES[i],
    totalSales: 0,
    totalInvoices: 0,
    totalSubtotal: 0,
    gstAmount: 0,
    totalRevenue: 0,
  }));

  let totalYearlyRevenue = 0;
  let totalYearlySubtotal = 0;
  let totalYearlyGst = 0;
  const productMap = new Map();
  const customerMap = new Map();

  yearlyInvoices.forEach((inv) => {
    const mIdx = (inv.month >= 1 && inv.month <= 12) ? inv.month - 1 : 0;
    monthlyBreakdown[mIdx].totalInvoices += 1;
    monthlyBreakdown[mIdx].totalSales += 1;
    monthlyBreakdown[mIdx].totalSubtotal += inv.subtotal;
    monthlyBreakdown[mIdx].gstAmount += inv.gst_amount;
    monthlyBreakdown[mIdx].totalRevenue += inv.totalAmount;

    totalYearlyRevenue += inv.totalAmount;
    totalYearlySubtotal += inv.subtotal;
    totalYearlyGst += inv.gst_amount;

    // Customer tracking
    const cName = inv.customerName.trim() || 'Walk-in Customer';
    const cStats = customerMap.get(cName) || { customerName: cName, invoiceCount: 0, totalSpent: 0 };
    cStats.invoiceCount += 1;
    cStats.totalSpent += inv.totalAmount;
    customerMap.set(cName, cStats);

    // Products tracking
    if (Array.isArray(inv.items)) {
      inv.items.forEach((item) => {
        const pName = item.product_name || item.productName || 'Product';
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.total) || 0;
        const pStats = productMap.get(pName) || { productName: pName, quantitySold: 0, revenueGenerated: 0 };
        pStats.quantitySold += qty;
        pStats.revenueGenerated += rev;
        productMap.set(pName, pStats);
      });
    }
  });

  const products = Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);
  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  const bestSellingProduct = products.length > 0 ? products[0] : null;
  const topCustomer = customers.length > 0 ? customers[0] : null;
  const totalInvoices = yearlyInvoices.length;
  const averageInvoiceValue = totalInvoices > 0 ? totalYearlyRevenue / totalInvoices : 0;

  const summary = {
    totalRevenue: Number(totalYearlyRevenue.toFixed(2)),
    totalSubtotal: Number(totalYearlySubtotal.toFixed(2)),
    totalGst: Number(totalYearlyGst.toFixed(2)),
    totalInvoices,
    totalSales: totalInvoices,
    averageInvoiceValue: Number(averageInvoiceValue.toFixed(2)),
    bestSellingProduct,
    topCustomer,
  };

  const fileName = `Yearly-Sales-Report-${targetYear}.pdf`;

  return generateYearlyReportPDF({
    year: targetYear,
    company,
    summary,
    monthlyBreakdown,
    products,
    customers,
    invoices: yearlyInvoices,
    fileName,
    delivery: options.delivery || 'save',
  });
};

// ─── TOTAL / LIFETIME REPORT DOWNLOAD ────────────────────────────────────────

export const downloadTotalReportPdf = async (options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated.');

  const company = await fetchCompanyProfile(user);

  // 1. Fetch All Historical Invoices
  const { records } = await loadMergedRecords(user.uid);

  const allInvoices = records.map((data) => ({
    id: data.id,
    invoiceNumber: data.invoice_number || data.invoiceNumber || `INV-${String(data.id).substring(0, 8)}`,
    customerName: customerLabel(data),
    invoiceDate: data.created_at || new Date().toISOString(),
    itemsCount: Array.isArray(data.items) ? data.items.length : 1,
    subtotal: recordSubtotal(data),
    gst_amount: recordGst(data),
    totalAmount: recordGrandTotal(data),
    items: data.items || [],
    year: recordYear(data) || new Date().getFullYear(),
    month: recordMonth(data) || 1,
  }));

  allInvoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  // Earliest date detection
  let earliestDate = company.createdAt ? new Date(company.createdAt) : null;
  if (allInvoices.length > 0) {
    const oldestInvoiceDate = new Date(allInvoices[allInvoices.length - 1].invoiceDate);
    if (!earliestDate || oldestInvoiceDate < earliestDate) {
      earliestDate = oldestInvoiceDate;
    }
  }

  const periodStr = earliestDate
    ? `From ${earliestDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} to Present`
    : 'All Time History';

  const accountCreatedStr = company.createdAt
    ? new Date(company.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : (earliestDate ? earliestDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Active');

  // 2. Fetch Current Live Inventory
  let totalStockUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalProducts = 0;

  try {
    const productsRef = collection(db, `users/${user.uid}/products`);
    const prodSnap = await getDocs(productsRef);
    totalProducts = prodSnap.size;
    prodSnap.forEach((pd) => {
      const pData = pd.data();
      const qty = Number(pData.quantity) || 0;
      totalStockUnits += qty;
      if (qty <= 0) outOfStockCount += 1;
      else if (qty <= 10) lowStockCount += 1;
    });
  } catch (_) {}

  const inventory = {
    totalProducts,
    totalStockUnits,
    lowStockCount,
    outOfStockCount,
  };

  // 3. Aggregate Lifetime Calculations
  let totalLifetimeRevenue = 0;
  let totalLifetimeSubtotal = 0;
  let totalLifetimeGst = 0;
  const yearMap = new Map();
  const productMap = new Map();
  const customerMap = new Map();

  allInvoices.forEach((inv) => {
    totalLifetimeRevenue += inv.totalAmount;
    totalLifetimeSubtotal += inv.subtotal;
    totalLifetimeGst += inv.gst_amount;

    // Yearly Breakdown
    const yStats = yearMap.get(inv.year) || {
      year: inv.year,
      totalSales: 0,
      totalInvoices: 0,
      totalRevenue: 0,
      gstAmount: 0,
    };
    yStats.totalSales += 1;
    yStats.totalInvoices += 1;
    yStats.totalRevenue += inv.totalAmount;
    yStats.gstAmount += inv.gst_amount;
    yearMap.set(inv.year, yStats);

    // Customer Breakdown
    const cName = inv.customerName.trim() || 'Walk-in Customer';
    const cStats = customerMap.get(cName) || { customerName: cName, invoiceCount: 0, totalSpent: 0 };
    cStats.invoiceCount += 1;
    cStats.totalSpent += inv.totalAmount;
    customerMap.set(cName, cStats);

    // Products Breakdown
    if (Array.isArray(inv.items)) {
      inv.items.forEach((item) => {
        const pName = item.product_name || item.productName || 'Product';
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.total) || 0;
        const pStats = productMap.get(pName) || { productName: pName, quantitySold: 0, revenueGenerated: 0 };
        pStats.quantitySold += qty;
        pStats.revenueGenerated += rev;
        productMap.set(pName, pStats);
      });
    }
  });

  const yearlyBreakdown = Array.from(yearMap.values()).sort((a, b) => b.year - a.year);
  const products = Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);
  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

  const bestSellingProduct = products.length > 0 ? products[0] : null;
  const topCustomer = customers.length > 0 ? customers[0] : null;
  const totalInvoices = allInvoices.length;
  const averageInvoiceValue = totalInvoices > 0 ? totalLifetimeRevenue / totalInvoices : 0;

  const summary = {
    totalRevenue: Number(totalLifetimeRevenue.toFixed(2)),
    totalSubtotal: Number(totalLifetimeSubtotal.toFixed(2)),
    totalGst: Number(totalLifetimeGst.toFixed(2)),
    totalInvoices,
    totalSales: totalInvoices,
    averageInvoiceValue: Number(averageInvoiceValue.toFixed(2)),
    bestSellingProduct,
    topCustomer,
  };

  const fileName = 'Complete-Business-Report.pdf';

  return generateTotalReportPDF({
    company,
    summary,
    yearlyBreakdown,
    monthlyBreakdown: [],
    products,
    customers,
    inventory,
    invoices: allInvoices,
    period: periodStr,
    accountCreatedAt: accountCreatedStr,
    fileName,
    delivery: options.delivery || 'save',
  });
};

function customRangeFileSlug(value) {
  return formatRangeLabel(value).replace(/\s+/g, '-') || 'date';
}

/**
 * Custom date range report. Uses the same merged sales/invoice records as the
 * monthly, yearly, and lifetime reports, then keeps invoices whose stored
 * calendar date falls on From Date through To Date inclusive.
 */
export const downloadCustomRangeReportPdf = async ({ fromDate, toDate, delivery = 'save' } = {}) => {
  const validationError = validateDateRange(fromDate, toDate);
  if (validationError) throw new Error(validationError);

  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated.');

  const fromLabel = formatRangeLabel(fromDate);
  const toLabel = formatRangeLabel(toDate);
  const company = await fetchCompanyProfile(user);
  const { records, salesRecordsBlocked } = await loadMergedRecords(user.uid);
  const report = buildCustomRangeReport(records, { fromDate, toDate });

  if (report.summary.totalInvoices === 0) {
    throw new Error(`No invoices were found from ${fromLabel} to ${toLabel}. Choose a different date range.`);
  }

  const fileName = `Custom-Date-Range-Report-${customRangeFileSlug(fromDate)}-to-${customRangeFileSlug(toDate)}.pdf`;

  return generateCustomRangeReportPDF({
    company,
    fromLabel,
    toLabel,
    generatedLabel: formatRangeLabel(new Date()),
    summary: report.summary,
    products: report.products,
    invoices: report.invoices,
    salesRecordsBlocked,
    fileName,
    delivery,
  });
};
