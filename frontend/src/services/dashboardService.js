import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { formatVariantLabel } from '../utils/productVariant';

/**
 * Fetch dashboard stats for the currently logged-in user.
 */
export const getDashboard = async () => {
  const user = auth.currentUser;
  if (!user) {
    return {
      success: true,
      dashboard: {
        totalProducts: 0,
        totalStock: 0,
        todaySales: "0.00",
        monthlySales: "0.00",
        yearlySales: "0.00",
        totalRevenue: "0.00",
        totalBills: 0,
      },
      recentBills: [],
      lowStockProducts: [],
      bestSellingProducts: [],
    };
  }

  const userId = user.uid;

  // 1. Fetch aggregate stats document
  const statsSnap = await getDoc(doc(db, `users/${userId}/stats/dashboard`));
  const statsData = statsSnap.exists() ? statsSnap.data() : {};

  // 2. Fetch all products to compute totalProducts, totalStock, and lowStockProducts
  const productsSnap = await getDocs(collection(db, `users/${userId}/products`));
  let totalStock = 0;
  const lowStockProducts = [];

  productsSnap.forEach((d) => {
    const prod = d.data();
    const qty = typeof prod.quantity === 'number' ? prod.quantity : 0;
    totalStock += qty;

    if (qty <= 10) {
      lowStockProducts.push({
        id: d.id,
        item_name: prod.itemName || '',
        package_weight: String(Number(prod.packageWeight || 0).toFixed(2)),
        weight_unit: prod.weightUnit || 'g',
        selling_price: String(Number(prod.sellingPrice || 0).toFixed(2)),
        quantity: qty,
      });
    }
  });

  // 3. Fetch recent 10 bills
  const recentBillsQuery = query(
    collection(db, `users/${userId}/invoices`),
    orderBy('created_at', 'desc'),
    firestoreLimit(10)
  );
  const recentBillsSnap = await getDocs(recentBillsQuery);
  const recentBills = recentBillsSnap.docs.map((d) => {
    const inv = d.data();
    return {
      id: d.id,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      grand_total: inv.grand_total,
      created_at: inv.created_at,
    };
  });

  // 4. Compute best-selling products from invoices
  const bestSellingMap = new Map();
  recentBillsSnap.docs.forEach((d) => {
    const inv = d.data();
    if (Array.isArray(inv.items)) {
      inv.items.forEach((item) => {
        const name = item.product_name || item.productName || 'Product';
        const qty = Number(item.quantity) || 0;
        const rev = Number(item.total) || 0;
        const curr = bestSellingMap.get(name) || { totalSold: 0, revenue: 0 };
        bestSellingMap.set(name, {
          totalSold: curr.totalSold + qty,
          revenue: curr.revenue + rev,
        });
      });
    }
  });

  const bestSellingProducts = Array.from(bestSellingMap.entries())
    .map(([name, val]) => ({
      product_name: name,
      totalSold: String(val.totalSold),
      revenue: String(val.revenue.toFixed(2)),
    }))
    .sort((a, b) => Number(b.totalSold) - Number(a.totalSold))
    .slice(0, 10);

  return {
    success: true,
    dashboard: {
      totalProducts: productsSnap.size,
      totalStock: totalStock,
      todaySales: String((Number(statsData.todaySales) || 0).toFixed(2)),
      monthlySales: String((Number(statsData.monthlySales) || 0).toFixed(2)),
      yearlySales: String((Number(statsData.yearlySales) || 0).toFixed(2)),
      totalRevenue: String((Number(statsData.totalRevenue) || 0).toFixed(2)),
      totalBills: statsData.totalBills || recentBillsSnap.size,
    },
    recentBills,
    lowStockProducts,
    bestSellingProducts,
  };
};
