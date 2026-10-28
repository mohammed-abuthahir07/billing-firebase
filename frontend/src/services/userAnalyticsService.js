import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      topCustomersMonth: [],
      topCustomersYear: [],
      bestCustomerMonth: null,
      bestCustomerYear: null,
    };
  }

  const userId = user.uid;
  const invoicesRef = collection(db, `users/${userId}/invoices`);
  const q = query(invoicesRef, where('year', '==', currentYear));
  const snap = await getDocs(q);

  let monthRevenue = 0;
  let yearRevenue = 0;
  let monthInvoices = 0;
  let yearInvoices = snap.size;

  const monthlyTotals = new Map();
  for (let m = 1; m <= currentMonth; m++) {
    monthlyTotals.set(m, { revenue: 0, invoices: 0 });
  }

  const customerYearMap = new Map();
  const customerMonthMap = new Map();

  snap.forEach((doc) => {
    const inv = doc.data();
    const invMonth = inv.month || (inv.created_at ? new Date(inv.created_at).getMonth() + 1 : 1);
    const grandTotal = Number(inv.grand_total) || 0;
    const customer = inv.customer_name || 'Walk-in Customer';

    yearRevenue += grandTotal;

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
    topCustomersMonth,
    topCustomersYear,
    bestCustomerMonth: topCustomersMonth.length > 0 ? topCustomersMonth[0] : null,
    bestCustomerYear: topCustomersYear.length > 0 ? topCustomersYear[0] : null,
  };
};
