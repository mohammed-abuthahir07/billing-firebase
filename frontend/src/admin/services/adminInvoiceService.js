import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";

/**
 * Fetch all invoices across all registered companies for the Admin panel.
 * Pure Spark-compliant client-side querying.
 */
export const getAdminInvoices = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const allInvoices = [];
        const companiesMap = new Map();

        for (const uDoc of usersSnap.docs) {
            const uId = uDoc.id;
            const uData = uDoc.data();

            let companyName = uData.name || "Business User";
            let companyEmail = uData.email || "";
            let companyGST = "";

            try {
                const profileSnap = await getDoc(doc(db, `users/${uId}/profile/company`));
                if (profileSnap.exists()) {
                    const pData = profileSnap.data();
                    companyName = pData.companyName || companyName;
                    companyEmail = pData.alternateEmail || companyEmail;
                    companyGST = pData.gstNumber || "";
                }
            } catch (_) {}

            companiesMap.set(uId, companyName);

            try {
                const invSnap = await getDocs(collection(db, `users/${uId}/invoices`));
                invSnap.forEach((docSnap) => {
                    const d = docSnap.data();
                    const subtotal = Number(d.subtotal) || 0;
                    const gstAmount = Number(d.gst_amount) || 0;
                    const grandTotal = Number(d.grand_total) || 0;

                    const dateStr = d.created_at || (d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : new Date().toISOString());

                    allInvoices.push({
                        id: docSnap.id,
                        userId: uId,
                        invoiceNumber: d.invoice_number || d.invoiceNumber || `INV-${docSnap.id.substring(0, 8)}`,
                        companyName: d.seller_name || d.sellerName || companyName,
                        companyEmail: d.seller_email || companyEmail,
                        companyGST: d.seller_gst || companyGST,
                        customerName: d.customer_name || d.customerName || "Customer",
                        customerEmail: d.customer_email || "",
                        customerGST: d.customer_gst || "",
                        customerAddress: d.customer_address || "",
                        subtotal,
                        gstAmount,
                        grandTotal,
                        invoiceDate: dateStr,
                        status: d.status || "Paid",
                        items: Array.isArray(d.items) ? d.items : [],
                        // Preserve full invoice payload for vector PDF generation
                        raw: {
                            ...d,
                            id: docSnap.id,
                            invoice_number: d.invoice_number || d.invoiceNumber || `INV-${docSnap.id.substring(0, 8)}`,
                            seller_name: d.seller_name || d.sellerName || companyName,
                            seller_email: d.seller_email || companyEmail,
                            seller_gst: d.seller_gst || companyGST,
                            created_at: dateStr,
                            grand_total: String(grandTotal.toFixed(2)),
                            subtotal: String(subtotal.toFixed(2)),
                            gst_amount: String(gstAmount.toFixed(2)),
                        },
                    });
                });
            } catch (_) {
                // Non-blocking for empty invoice collections
            }
        }

        // Sort by invoiceDate descending by default
        allInvoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

        const totalInvoices = allInvoices.length;
        const totalRevenue = allInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
        const totalGST = allInvoices.reduce((sum, inv) => sum + inv.gstAmount, 0);

        const companiesList = Array.from(companiesMap.entries()).map(([id, name]) => ({
            id,
            name,
        }));

        return {
            success: true,
            invoices: allInvoices,
            totalInvoices,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalGST: Number(totalGST.toFixed(2)),
            companiesList,
        };
    } catch (err) {
        console.error("[AdminInvoices] Error fetching invoices:", err);
        throw new Error(err.message || "Failed to load invoices.");
    }
};
