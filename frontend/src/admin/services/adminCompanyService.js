import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";

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
                    const pSnap = await getDocs(collection(db, `users/${uId}/products`));
                    totalProducts = pSnap.size;
                } catch (pErr) {}

                let totalInvoices = 0;
                let totalRevenue = 0;
                let monthlyRevenue = 0;
                let yearlyRevenue = 0;
                const now = new Date();
                const currYear = now.getFullYear();
                const currMonth = now.getMonth() + 1;

                try {
                    const invSnap = await getDocs(collection(db, `users/${uId}/invoices`));
                    totalInvoices = invSnap.size;
                    invSnap.forEach((inv) => {
                        const d = inv.data();
                        const val = Number(d.grand_total) || 0;
                        totalRevenue += val;
                        if (d.year === currYear) {
                            yearlyRevenue += val;
                            if (d.month === currMonth) {
                                monthlyRevenue += val;
                            }
                        }
                    });
                } catch (iErr) {}

                return {
                    id: uId,
                    name: companyName,
                    email: uData.email || "",
                    created_at: uData.createdAt || new Date().toISOString(),
                    totalProducts,
                    totalInvoices,
                    monthlyRevenue: monthlyRevenue.toFixed(2),
                    yearlyRevenue: yearlyRevenue.toFixed(2),
                    totalRevenue: totalRevenue.toFixed(2),
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
            const pSnap = await getDocs(collection(db, `users/${id}/products`));
            totalProducts = pSnap.size;
        } catch (pErr) {}

        let totalInvoices = 0;
        let totalRevenue = 0;
        let monthlyRevenue = 0;
        const now = new Date();
        const currYear = now.getFullYear();
        const currMonth = now.getMonth() + 1;
        const recentInvoices = [];

        try {
            const invSnap = await getDocs(collection(db, `users/${id}/invoices`));
            totalInvoices = invSnap.size;
            const sortedDocs = invSnap.docs.sort((a, b) => {
                const da = new Date(a.data().created_at || 0);
                const db = new Date(b.data().created_at || 0);
                return db - da;
            });

            sortedDocs.forEach((inv, idx) => {
                const d = inv.data();
                const val = Number(d.grand_total) || 0;
                totalRevenue += val;
                if (d.year === currYear && d.month === currMonth) {
                    monthlyRevenue += val;
                }
                if (idx < 10) {
                    recentInvoices.push({
                        invoice_number: d.invoice_number || `INV-${inv.id}`,
                        customer_name: d.customer_name || "Customer",
                        grand_total: String(val.toFixed(2)),
                        created_at: d.created_at || new Date().toISOString(),
                    });
                }
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
                totalRevenue: totalRevenue.toFixed(2),
                totalProducts,
                monthlyRevenue: monthlyRevenue.toFixed(2),
            },
            recentInvoices,
        };
    } catch (err) {
        console.error("[AdminCompanyDetails] Fetch error:", err);
        throw new Error(err.message || "Company not found");
    }
};
