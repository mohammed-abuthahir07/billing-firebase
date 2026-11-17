import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { loadMergedRecords } from "../../utils/salesHistory";
import { money, recordGrandTotal, recordMonth, recordYear } from "../../utils/salesMerge";

async function financialsFor(userId) {
  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = now.getMonth() + 1;
  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;
  let salesRecordsBlocked = false;

  try {
    const statsSnap = await getDoc(doc(db, `users/${userId}/stats/dashboard`));
    if (statsSnap.exists()) {
      const stats = statsSnap.data();
      totalRevenue = money(stats.totalRevenue);
      monthlyRevenue = money(stats.monthlySales);
      yearlyRevenue = money(stats.yearlySales);
      if (totalRevenue > 0) {
        return { totalRevenue, monthlyRevenue, yearlyRevenue, salesRecordsBlocked };
      }
    }
  } catch (_) {}

  const merged = await loadMergedRecords(userId);
  salesRecordsBlocked = merged.salesRecordsBlocked;
  merged.records.forEach((record) => {
    const value = recordGrandTotal(record);
    totalRevenue += value;
    if (recordYear(record) === currYear) {
      yearlyRevenue += value;
      if (recordMonth(record) === currMonth) monthlyRevenue += value;
    }
  });

  return { totalRevenue, monthlyRevenue, yearlyRevenue, salesRecordsBlocked };
}

// ======================================
// GET ALL COMPANIES
// ======================================
export const getCompanies = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const companies = await Promise.all(
            usersSnap.docs.map(async (uDoc) => {
                const uData = uDoc.data();
                const uId = uDoc.id;

                let companyName = uData.name || "Business User";
                try {
                    const profileSnap = await getDoc(doc(db, `users/${uId}/profile/company`));
                    if (profileSnap.exists()) {
                        companyName = profileSnap.data().companyName || companyName;
                    }
                } catch (pErr) {}

                let totalProducts = 0;
                try {
                    const pCount = await getCountFromServer(collection(db, `users/${uId}/products`));
                    totalProducts = pCount.data().count;
                } catch (pErr) {}

                let totalInvoices = 0;
                const finance = await financialsFor(uId);
                let salesRecordsBlocked = finance.salesRecordsBlocked;

                try {
                    const invCount = await getCountFromServer(collection(db, `users/${uId}/invoices`));
                    totalInvoices = invCount.data().count;
                } catch (iErr) {}

                return {
                    id: uId,
                    name: companyName,
                    email: uData.email || "",
                    created_at: uData.createdAt || new Date().toISOString(),
                    totalProducts,
                    totalInvoices,
                    monthlyRevenue: finance.monthlyRevenue.toFixed(2),
                    yearlyRevenue: finance.yearlyRevenue.toFixed(2),
                    totalRevenue: finance.totalRevenue.toFixed(2),
                    salesRecordsBlocked,
                };
            })
        );

        return {
            success: true,
            totalCompanies: companies.length,
            companies,
        };
    } catch (err) {
        console.error("[AdminCompanies] Fetch error:", err);
        throw new Error(err.message || "Failed to load companies.");
    }
};

// ======================================
// GET SINGLE COMPANY DETAILS
// ======================================
export const getCompany = async (id) => {
    try {
        const uDoc = await getDoc(doc(db, `users/${id}`));
        if (!uDoc.exists()) {
            throw new Error("Company not found");
        }
        const uData = uDoc.data();

        let companyName = uData.name || "Business User";
        try {
            const profileSnap = await getDoc(doc(db, `users/${id}/profile/company`));
            if (profileSnap.exists()) {
                companyName = profileSnap.data().companyName || companyName;
            }
        } catch (pErr) {}

        let totalProducts = 0;
        try {
            const pCount = await getCountFromServer(collection(db, `users/${id}/products`));
            totalProducts = pCount.data().count;
        } catch (pErr) {}

        const finance = await financialsFor(id);
        let totalInvoices = 0;
        const recentInvoices = [];

        try {
            const invCount = await getCountFromServer(collection(db, `users/${id}/invoices`));
            totalInvoices = invCount.data().count;
            const invSnap = await getDocs(query(
                collection(db, `users/${id}/invoices`),
                orderBy('created_at', 'desc'),
                limit(5)
            ));

            invSnap.docs.forEach((inv) => {
                const data = inv.data();
                recentInvoices.push({
                    id: inv.id,
                    invoice_number: data.invoice_number || data.invoiceNumber || `INV-${inv.id}`,
                    customer_name: data.customer_name || data.customerName || "Customer",
                    customer_email: data.customer_email || data.customerEmail || "",
                    customer_phone: data.customer_phone || data.customerPhone || "",
                    customer_gst: data.customer_gst || "",
                    customer_address: data.customer_address || data.customerAddress || "",
                    seller_name: data.seller_name || companyName,
                    seller_email: data.seller_email || "",
                    seller_gst: data.seller_gst || "",
                    subtotal: data.subtotal || "0.00",
                    gst_amount: data.gst_amount || "0.00",
                    grand_total: String(Number(data.grand_total || 0).toFixed(2)),
                    created_at: data.created_at || new Date().toISOString(),
                    status: data.status || "Paid",
                    items: Array.isArray(data.items) ? data.items : [],
                });
            });
        } catch (iErr) {}

        return {
            success: true,
            company: {
                id,
                name: companyName,
                email: uData.email,
                created_at: uData.createdAt,
                totalInvoices,
                totalRevenue: finance.totalRevenue.toFixed(2),
                totalProducts,
                monthlyRevenue: finance.monthlyRevenue.toFixed(2),
            },
            recentInvoices,
            salesRecordsBlocked: finance.salesRecordsBlocked,
        };
    } catch (err) {
        console.error("[AdminCompanyDetails] Fetch error:", err);
        throw new Error(err.message || "Company not found");
    }
};
