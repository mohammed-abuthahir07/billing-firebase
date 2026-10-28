import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";

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
        for (const uDoc of usersSnap.docs) {
            try {
                const invSnap = await getDocs(collection(db, `users/${uDoc.id}/invoices`));
                invSnap.forEach((invDoc) => {
                    const data = invDoc.data();
                    const d = data.created_at ? new Date(data.created_at) : new Date();
                    if (d.getFullYear() === currentYear) {
                        const m = MONTHS_SHORT[d.getMonth()];
                        const rev = Number(data.grand_total) || 0;
                        monthlyRevenue.set(m, (monthlyRevenue.get(m) || 0) + rev);
                    }
                });
            } catch (iErr) {}
        }
        return MONTHS_SHORT.map((m) => ({
            month: m,
            revenue: (monthlyRevenue.get(m) || 0).toFixed(2),
        }));
    } catch (err) {
        console.error("[RevenueAnalytics] Fetch error:", err);
        return MONTHS_SHORT.map((m) => ({ month: m, revenue: "0.00" }));
    }
};

// Invoice Analytics: Count invoices per month
export const getInvoiceAnalytics = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const monthlyInvoices = new Map();
        MONTHS_SHORT.forEach((m) => monthlyInvoices.set(m, 0));

        const usersSnap = await getDocs(collection(db, "users"));
        for (const uDoc of usersSnap.docs) {
            try {
                const invSnap = await getDocs(collection(db, `users/${uDoc.id}/invoices`));
                invSnap.forEach((invDoc) => {
                    const data = invDoc.data();
                    const d = data.created_at ? new Date(data.created_at) : new Date();
                    if (d.getFullYear() === currentYear) {
                        const m = MONTHS_SHORT[d.getMonth()];
                        monthlyInvoices.set(m, (monthlyInvoices.get(m) || 0) + 1);
                    }
                });
            } catch (iErr) {}
        }
        return MONTHS_SHORT.map((m) => ({
            month: m,
            invoices: monthlyInvoices.get(m) || 0,
        }));
    } catch (err) {
        console.error("[InvoiceAnalytics] Fetch error:", err);
        return MONTHS_SHORT.map((m) => ({ month: m, invoices: 0 }));
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
