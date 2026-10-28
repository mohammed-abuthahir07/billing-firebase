import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { generateMonthlyReportPDF } from '../utils/reportPdfGenerator';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

  const invoicesRef = collection(db, `users/${user.uid}/invoices`);
  const q = query(invoicesRef, where('year', '==', year), where('month', '==', month));
  const snap = await getDocs(q);

  let totalRevenue = 0;
  let totalSubtotal = 0;
  let totalGst = 0;
  const productSalesMap = new Map();

  snap.forEach((doc) => {
    const data = doc.data();
    totalRevenue += Number(data.grand_total) || 0;
    totalSubtotal += Number(data.subtotal) || 0;
    totalGst += Number(data.gst_amount) || 0;

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

  const totalInvoices = snap.size;
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
  };
};

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

  const invoicesRef = collection(db, `users/${user.uid}/invoices`);
  const q = query(invoicesRef, where('year', '==', year), where('month', '==', month));
  const snap = await getDocs(q);

  let filteredInvoices = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      invoiceNumber: data.invoice_number,
      customerName: data.customer_name,
      invoiceDate: data.created_at,
      itemsCount: Array.isArray(data.items) ? data.items.length : 1,
      totalAmount: Number(data.grand_total) || 0,
    };
  });

  if (search) {
    filteredInvoices = filteredInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.customerName.toLowerCase().includes(search)
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

  const invoicesRef = collection(db, `users/${user.uid}/invoices`);
  const q = query(invoicesRef, where('year', '==', year), where('month', '==', month));
  const snap = await getDocs(q);

  const productMap = new Map();
  snap.forEach((d) => {
    const data = d.data();
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
    try {
      const profileDoc = await getDoc(doc(db, `users/${user.uid}/profile/company`));
      if (profileDoc.exists()) company = profileDoc.data();

      const userDoc = await getDoc(doc(db, `users/${user.uid}`));
      if (userDoc.exists()) {
        const uData = userDoc.data();
        company.name = company.companyName || uData.name || user.displayName || 'Business User';
        company.email = company.alternateEmail || uData.email || user.email || '';
      }
    } catch (_) {}

    try {
      const invoicesRef = collection(db, `users/${user.uid}/invoices`);
      const q = query(
        invoicesRef,
        where('year', '==', summaryRes.year),
        where('month', '==', summaryRes.month)
      );
      const snap = await getDocs(q);
      invoices = snap.docs.map((d) => {
        const data = d.data();
        return {
          invoiceNumber: data.invoice_number,
          customerName: data.customer_name,
          invoiceDate: data.created_at,
          itemsCount: Array.isArray(data.items) ? data.items.length : 1,
          totalAmount: Number(data.grand_total) || 0,
        };
      });
    } catch (_) {}
  }

  return generateMonthlyReportPDF({
    summary: summaryRes.summary,
    products: productsRes.products,
    invoices,
    company,
    reportMonth: summaryRes.reportMonth,
    fileName,
  });
};
