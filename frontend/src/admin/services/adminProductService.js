import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";

/**
 * Fetch all products across all registered companies for the Admin panel.
 * Read-only access, Spark-plan compliant.
 */
export const getAdminProducts = async () => {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const allProducts = [];
        const companiesMap = new Map();
        const categoriesSet = new Set();

        for (const uDoc of usersSnap.docs) {
            const uId = uDoc.id;
            const uData = uDoc.data();

            let companyName = uData.name || "Business User";

            try {
                const profileSnap = await getDoc(doc(db, `users/${uId}/profile/company`));
                if (profileSnap.exists()) {
                    companyName = profileSnap.data().companyName || companyName;
                }
            } catch (_) {}

            companiesMap.set(uId, companyName);

            try {
                const pSnap = await getDocs(collection(db, `users/${uId}/products`));
                pSnap.forEach((docSnap) => {
                    const d = docSnap.data();
                    const qty = typeof d.quantity === "number" ? d.quantity : (Number(d.quantity) || 0);
                    const category = d.category || "General";
                    categoriesSet.add(category);

                    let stockStatus = "In Stock";
                    if (qty <= 0) {
                        stockStatus = "Out of Stock";
                    } else if (qty <= 5) {
                        stockStatus = "Low Stock";
                    }

                    allProducts.push({
                        id: docSnap.id,
                        userId: uId,
                        companyName,
                        productName: d.itemName || d.item_name || "Unnamed Product",
                        sku: d.sku || "N/A",
                        category,
                        description: d.description || "",
                        packageWeight: d.packageWeight || d.package_weight || "",
                        weightUnit: d.weightUnit || d.weight_unit || "",
                        sellingPrice: Number(d.sellingPrice || d.selling_price) || 0,
                        gst: Number(d.gst) || 0,
                        quantity: qty,
                        stockStatus,
                        createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || "",
                        updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt || "",
                    });
                });
            } catch (_) {
                // Non-blocking for empty product collections
            }
        }

        // Sort by product name ascending
        allProducts.sort((a, b) => a.productName.localeCompare(b.productName));

        const totalProducts = allProducts.length;
        const totalStock = allProducts.reduce((sum, p) => sum + p.quantity, 0);
        const lowStockCount = allProducts.filter((p) => p.stockStatus === "Low Stock").length;
        const outOfStockCount = allProducts.filter((p) => p.stockStatus === "Out of Stock").length;

        const companiesList = Array.from(companiesMap.entries()).map(([id, name]) => ({
            id,
            name,
        }));

        const categoriesList = Array.from(categoriesSet).sort();

        return {
            success: true,
            products: allProducts,
            totalProducts,
            totalStock,
            lowStockCount,
            outOfStockCount,
            companiesList,
            categoriesList,
        };
    } catch (err) {
        console.error("[AdminProducts] Error fetching products:", err);
        throw new Error(err.message || "Failed to load products.");
    }
};
