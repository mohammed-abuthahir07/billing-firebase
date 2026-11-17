import { collection, doc, getCountFromServer, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { loadMergedRecords } from "../../utils/salesHistory";
import { recordGrandTotal, recordMonth, recordYear } from "../../utils/salesMerge";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const getAdminDashboard = async () => {
  const usersSnap = await getDocs(collection(db, "users"));
  const totalUsers = usersSnap.size;
  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = now.getMonth() + 1;

  let totalProducts = 0;
  let totalInvoices = 0;
  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let salesRecordsBlocked = false;
  const monthlyTotals = new Array(12).fill(0);
  const companies = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data() || {};
    let companyName = userData.name || "Business";
    try {
      const profileSnap = await getDoc(doc(db, `users/${userDoc.id}/profile/company`));
      if (profileSnap.exists()) companyName = profileSnap.data().companyName || companyName;
    } catch {
      /* The account name is enough when the profile cannot be read. */
    }

    try {
      const productCount = await getCountFromServer(collection(db, `users/${userDoc.id}/products`));
      totalProducts += productCount.data().count;
    } catch (error) {
      if (error?.code && String(error.code).includes("permission-denied")) continue;
      throw error;
    }

    const { records, salesRecordsBlocked: blocked } = await loadMergedRecords(userDoc.id);
    if (blocked) salesRecordsBlocked = true;

    let companyRevenue = 0;
    let companyMonth = 0;
    const companyMonths = new Array(12).fill(0);
    totalInvoices += records.length;
    records.forEach((record) => {
      const value = recordGrandTotal(record);
      companyRevenue += value;
      totalRevenue += value;
      if (recordYear(record) === currYear) {
        const month = recordMonth(record);
        if (month >= 1 && month <= 12) {
          monthlyTotals[month - 1] += value;
          companyMonths[month - 1] += value;
        }
        if (month === currMonth) {
          monthlyRevenue += value;
          companyMonth += value;
        }
      }
    });
    companies.push({
      name: companyName,
      revenue: Number(companyRevenue.toFixed(2)),
      monthRevenue: Number(companyMonth.toFixed(2)),
      months: companyMonths.map((amount) => Number(amount.toFixed(2))),
      invoices: records.length,
    });
  }

  companies.sort((a, b) => b.revenue - a.revenue);

  return {
    totalUsers,
    totalProducts,
    totalInvoices,
    totalRevenue: totalRevenue.toFixed(2),
    monthlyRevenue: monthlyRevenue.toFixed(2),
    monthlySeries: MONTHS.map((label, index) => ({
      label,
      value: Number(monthlyTotals[index].toFixed(2)),
    })),
    companies,
    salesRecordsBlocked,
  };
};
