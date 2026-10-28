import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export const getAdminDashboard = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const totalUsers = usersSnap.size;

        let totalProducts = 0;
        let totalInvoices = 0;
        let totalRevenue = 0;
        let monthlyRevenue = 0;

        const now = new Date();
        const currYear = now.getFullYear();
        const currMonth = now.getMonth() + 1;

        for (const uDoc of usersSnap.docs) {
            try {
                const pSnap = await getDocs(collection(db, `users/${uDoc.id}/products`));
                totalProducts += pSnap.size;
            } catch (pErr) {
                // Non-blocking for empty product collections
            }

            try {
                const iSnap = await getDocs(collection(db, `users/${uDoc.id}/invoices`));
                totalInvoices += iSnap.size;
                iSnap.forEach((inv) => {
                    const d = inv.data();
                    const val = Number(d.grand_total) || 0;
                    totalRevenue += val;
                    if (d.year === currYear && d.month === currMonth) {
                        monthlyRevenue += val;
                    }
                });
            } catch (iErr) {
                // Non-blocking for empty invoice collections
            }
        }

        return {
            totalUsers,
            totalProducts,
            totalInvoices,
            totalRevenue: totalRevenue.toFixed(2),
            monthlyRevenue: monthlyRevenue.toFixed(2),
        };
    } catch (dbErr) {
        console.error("[AdminDashboard] Firestore calculation error:", dbErr);
        throw new Error(dbErr.message || "Failed to load admin dashboard statistics.");
    }
};
