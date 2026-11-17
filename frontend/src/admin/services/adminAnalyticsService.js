import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { loadMergedRecords } from "../../utils/salesHistory";
import { recordGrandTotal, recordMonth, recordYear } from "../../utils/salesMerge";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Users Analytics: Count users registered per month
export const getUsersAnalytics = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyCounts = new Map();
        MONTHS_SHORT.forEach((m) => monthlyCounts.set(m, 0));

        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach((uDoc) => {
            const data = uDoc.data();
            if (data.createdAt) {
                const d = new Date(data.createdAt);
                if (d.getFullYear() === currentYear) {
                    const m = MONTHS_SHORT[d.getMonth()];
                    monthlyCounts.set(m, (monthlyCounts.get(m) || 0) + 1);
                }
            }
        });
        return MONTHS_SHORT.map((m) => ({ month: m, users: monthlyCounts.get(m) || 0 }));
    } catch (err) {
        console.error("[UsersAnalytics] Fetch error:", err);
        return MONTHS_SHORT.map((m) => ({ month: m, users: 0 }));
    }
};

// Revenue Analytics: Sum invoices.grand_total grouped by month
export const getRevenueAnalytics = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = new Map();
        MONTHS_SHORT.forEach((m) => monthlyRevenue.set(m, 0));

        const usersSnap = await getDocs(collection(db, "users"));
        let salesRecordsBlocked = false;
        for (const uDoc of usersSnap.docs) {
            const merged = await loadMergedRecords(uDoc.id, { year: currentYear });
            if (merged.salesRecordsBlocked) salesRecordsBlocked = true;
            merged.records.forEach((record) => {
                if (recordYear(record) !== currentYear) return;
                const month = MONTHS_SHORT[recordMonth(record) - 1];
                if (!month) return;
                const rev = recordGrandTotal(record);
                monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + rev);
            });
        }
        return {
            points: MONTHS_SHORT.map((m) => ({
                month: m,
                revenue: (monthlyRevenue.get(m) || 0).toFixed(2),
            })),
            salesRecordsBlocked,
        };
    } catch (err) {
        console.error("[RevenueAnalytics] Fetch error:", err);
        return {
            points: MONTHS_SHORT.map((m) => ({ month: m, revenue: "0.00" })),
            salesRecordsBlocked: false,
        };
    }
};

// Invoice Analytics: Count invoices per month
export const getInvoiceAnalytics = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyInvoices = new Map();
        MONTHS_SHORT.forEach((m) => monthlyInvoices.set(m, 0));

        const usersSnap = await getDocs(collection(db, "users"));
        let salesRecordsBlocked = false;
        for (const uDoc of usersSnap.docs) {
            const merged = await loadMergedRecords(uDoc.id, { year: currentYear });
            if (merged.salesRecordsBlocked) salesRecordsBlocked = true;
            merged.records.forEach((record) => {
                if (recordYear(record) !== currentYear) return;
                const month = MONTHS_SHORT[recordMonth(record) - 1];
                if (!month) return;
                monthlyInvoices.set(month, (monthlyInvoices.get(month) || 0) + 1);
            });
        }
        return {
            points: MONTHS_SHORT.map((m) => ({
                month: m,
                invoices: monthlyInvoices.get(m) || 0,
            })),
            salesRecordsBlocked,
        };
    } catch (err) {
        console.error("[InvoiceAnalytics] Fetch error:", err);
        return {
            points: MONTHS_SHORT.map((m) => ({ month: m, invoices: 0 })),
            salesRecordsBlocked: false,
        };
    }
};

// Product Analytics: Count products added per month
export const getProductAnalytics = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyProducts = new Map();
        MONTHS_SHORT.forEach((m) => monthlyProducts.set(m, 0));

        const usersSnap = await getDocs(collection(db, "users"));
        for (const uDoc of usersSnap.docs) {
            try {
                const prodSnap = await getDocs(collection(db, `users/${uDoc.id}/products`));
                prodSnap.forEach((pDoc) => {
                    const data = pDoc.data();
                    const d = data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null;
                    if (d && d.getFullYear() === currentYear) {
                        const m = MONTHS_SHORT[d.getMonth()];
                        monthlyProducts.set(m, (monthlyProducts.get(m) || 0) + 1);
                    }
                });
            } catch (pErr) {}
        }
        return MONTHS_SHORT.map((m) => ({
            month: m,
            products: monthlyProducts.get(m) || 0,
        }));
    } catch (err) {
        console.error("[ProductAnalytics] Fetch error:", err);
        return MONTHS_SHORT.map((m) => ({ month: m, products: 0 }));
    }
};
