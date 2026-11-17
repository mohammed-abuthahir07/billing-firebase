import { auth } from '../firebase/firebase';
import { loadMergedRecords } from '../utils/salesHistory';
import { customerLabel, recordGrandTotal, recordMonth } from '../utils/salesMerge';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function recordLocalDay(record) {
  const year = Number(record?.year);
  const month = Number(record?.month);
  const day = Number(record?.day);
  if (year && month && day) return { year, month, day };

  const created = record?.created_at || record?.createdAt;
  let date = null;
  if (created && typeof created.toDate === 'function') date = created.toDate();
  else if (created && typeof created.seconds === 'number') date = new Date(created.seconds * 1000);
  else if (created) {
    const parsed = new Date(created);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  if (!date) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function sameLocalDay(record, day) {
  const value = recordLocalDay(record);
  return Boolean(value && day && value.year === day.year && value.month === day.month && value.day === day.day);
}

export const getUserAnalytics = async () => {
  const user = auth.currentUser;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const period = {
    month: currentMonth,
    year: currentYear,
    monthLabel: `${MONTHS_SHORT[currentMonth - 1]} ${currentYear}`,
    yearLabel: String(currentYear),
  };

  if (!user) {
    return {
      success: true,
      period,
      summary: { monthRevenue: 0, yearRevenue: 0, monthInvoices: 0, yearInvoices: 0 },
      yearSeries: MONTHS_SHORT.slice(0, currentMonth).map((m) => ({ month: m, revenue: 0, invoices: 0 })),
      daySales: { today: 0, yesterday: 0 },
      topCustomersMonth: [],
      topCustomersYear: [],
      bestCustomerMonth: null,
      bestCustomerYear: null,
      topProductsMonth: [],
      topProductsYear: [],
    };
  }

  const { records, salesRecordsBlocked } = await loadMergedRecords(user.uid, { year: currentYear });

  let monthRevenue = 0;
  let yearRevenue = 0;
  let monthInvoices = 0;
  let yearInvoices = records.length;
  let todayRevenue = 0;
  let yesterdayRevenue = 0;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  const yesterdayKey = { year: yesterday.getFullYear(), month: yesterday.getMonth() + 1, day: yesterday.getDate() };

  const monthlyTotals = new Map();
  for (let m = 1; m <= currentMonth; m++) {
    monthlyTotals.set(m, { revenue: 0, invoices: 0 });
  }

  const customerYearMap = new Map();
  const customerMonthMap = new Map();
  const productMonthMap = new Map();
  const productYearMap = new Map();

  records.forEach((inv) => {
    const invMonth = recordMonth(inv);
    const grandTotal = recordGrandTotal(inv);
    const customer = customerLabel(inv);

    yearRevenue += grandTotal;
    if (sameLocalDay(inv, todayKey)) todayRevenue += grandTotal;
    if (sameLocalDay(inv, yesterdayKey)) yesterdayRevenue += grandTotal;

    // Monthly breakdown
    if (invMonth <= currentMonth) {
      const curr = monthlyTotals.get(invMonth) || { revenue: 0, invoices: 0 };
      monthlyTotals.set(invMonth, {
        revenue: curr.revenue + grandTotal,
        invoices: curr.invoices + 1,
      });
    }

    if (invMonth === currentMonth) {
      monthRevenue += grandTotal;
      monthInvoices += 1;

      const custMonth = customerMonthMap.get(customer) || { invoices: 0, revenue: 0 };
      customerMonthMap.set(customer, {
        invoices: custMonth.invoices + 1,
        revenue: custMonth.revenue + grandTotal,
      });

    }

    if (Array.isArray(inv.items)) {
      inv.items.forEach((item) => {
        const name = item.product_name || item.productName || 'Product';
        const qty = Number(item.quantity) || 0;
        productYearMap.set(name, (productYearMap.get(name) || 0) + qty);
        if (invMonth === currentMonth) {
          productMonthMap.set(name, (productMonthMap.get(name) || 0) + qty);
        }
      });
    }

    const custYear = customerYearMap.get(customer) || { invoices: 0, revenue: 0 };
    customerYearMap.set(customer, {
      invoices: custYear.invoices + 1,
      revenue: custYear.revenue + grandTotal,
    });
  });

  const yearSeries = MONTHS_SHORT.slice(0, currentMonth).map((monthName, idx) => {
    const data = monthlyTotals.get(idx + 1) || { revenue: 0, invoices: 0 };
    return {
      month: monthName,
      revenue: Number(data.revenue.toFixed(2)),
      invoices: data.invoices,
    };
  });

  const topCustomersMonth = Array.from(customerMonthMap.entries())
    .map(([customerName, data]) => ({
      customerName,
      invoices: data.invoices,
      revenue: Number(data.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topCustomersYear = Array.from(customerYearMap.entries())
    .map(([customerName, data]) => ({
      customerName,
      invoices: data.invoices,
      revenue: Number(data.revenue.toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    success: true,
    period,
    summary: {
      monthRevenue: Number(monthRevenue.toFixed(2)),
      yearRevenue: Number(yearRevenue.toFixed(2)),
      monthInvoices,
      yearInvoices,
    },
    yearSeries,
    daySales: {
      today: Number(todayRevenue.toFixed(2)),
      yesterday: Number(yesterdayRevenue.toFixed(2)),
    },
    topCustomersMonth,
    topCustomersYear,
    bestCustomerMonth: topCustomersMonth.length > 0 ? topCustomersMonth[0] : null,
    bestCustomerYear: topCustomersYear.length > 0 ? topCustomersYear[0] : null,
    topProductsMonth: Array.from(productMonthMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .filter((product) => product.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity),
    topProductsYear: Array.from(productYearMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .filter((product) => product.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity),
    salesRecordsBlocked,
  };
};
