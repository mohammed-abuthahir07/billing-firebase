import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getAdminDashboard = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
      throw new HttpsError("permission-denied", "Access Denied. Admin only.");
    }

    const db = admin.firestore();
    const overviewDoc = await db.doc("platform_stats/overview").get();
    const overviewData = overviewDoc.exists ? overviewDoc.data()! : {};

    // Also get active counts if overview doc is fresh/empty
    const usersCount = (await db.collection("users").count().get()).data().count;

    return {
      totalUsers: usersCount || overviewData.totalUsers || 0,
      totalProducts: overviewData.totalProducts || 0,
      totalInvoices: overviewData.totalInvoices || 0,
      totalRevenue: String((Number(overviewData.totalRevenue) || 0).toFixed(2)),
      monthlyRevenue: String((Number(overviewData.monthlyRevenue) || 0).toFixed(2)),
    };
  }
);
