import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const getMonthlyReportSummary = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const userId = auth.uid;
    const now = new Date();
    const month = Number(request.data?.month) || (now.getMonth() + 1);
    const year = Number(request.data?.year) || now.getFullYear();

    const db = admin.firestore();
    const invoicesSnapshot = await db
      .collection(`users/${userId}/invoices`)
      .where("year", "==", year)
      .where("month", "==", month)
      .get();

    let totalRevenue = 0;
    let totalSubtotal = 0;
    let totalGst = 0;
    const totalInvoices = invoicesSnapshot.size;
    const productSalesMap = new Map<string, { quantity: number; revenue: number }>();

    invoicesSnapshot.forEach((doc) => {
      const data = doc.data();
      totalRevenue += Number(data.grand_total) || 0;
      totalSubtotal += Number(data.subtotal) || 0;
      totalGst += Number(data.gst_amount) || 0;

      if (Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          const name = item.productName || item.product_name || "Unknown Product";
          const qty = Number(item.quantity) || 0;
          const rev = Number(item.total) || 0;
          const current = productSalesMap.get(name) || { quantity: 0, revenue: 0 };
          productSalesMap.set(name, {
            quantity: current.quantity + qty,
            revenue: current.revenue + rev,
          });
        });
      }
    });

    let bestSellingProduct: any = null;
    let maxQuantity = 0;
    for (const [name, stats] of productSalesMap.entries()) {
      if (stats.quantity > maxQuantity) {
        maxQuantity = stats.quantity;
        bestSellingProduct = {
          productName: name,
          quantitySold: stats.quantity,
          revenueGenerated: Number(stats.revenue.toFixed(2)),
        };
      }
    }

    const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
    const reportMonth = `${MONTH_NAMES[month - 1]} ${year}`;

    return {
      success: true,
      month,
      year,
      reportMonth,
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalSales: totalInvoices,
        totalInvoices,
        averageInvoiceValue: Number(averageInvoiceValue.toFixed(2)),
        totalGst: Number(totalGst.toFixed(2)),
        totalSubtotal: Number(totalSubtotal.toFixed(2)),
        bestSellingProduct,
      },
    };
  }
);
