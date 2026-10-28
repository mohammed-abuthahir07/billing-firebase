import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const getAdminAnalytics = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
      throw new HttpsError("permission-denied", "Access Denied. Admin only.");
    }

    const { type } = request.data as { type: "users" | "revenue" | "invoices" | "products" };
    const db = admin.firestore();
    const currentYear = new Date().getFullYear();

    const monthlyMap = new Map<string, number>();
    MONTHS_SHORT.forEach((m) => monthlyMap.set(m, 0));

    if (type === "users") {
      const usersSnap = await db.collection("users").get();
      usersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) {
          const d = new Date(data.createdAt);
          if (d.getFullYear() === currentYear) {
            const m = MONTHS_SHORT[d.getMonth()];
            monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1);
          }
        }
      });
      return MONTHS_SHORT.map((m) => ({ month: m, users: monthlyMap.get(m) || 0 }));
    }

    if (type === "revenue" || type === "invoices") {
      // Aggregate across all users' invoices for current year
      const usersSnap = await db.collection("users").get();
      for (const userDoc of usersSnap.docs) {
        const invoicesSnap = await db
          .collection(`users/${userDoc.id}/invoices`)
          .where("year", "==", currentYear)
          .get();

        invoicesSnap.forEach((invDoc) => {
          const data = invDoc.data();
          const monthIndex = (data.month || 1) - 1;
          const m = MONTHS_SHORT[monthIndex] || "Jan";
          if (type === "revenue") {
            const rev = Number(data.grand_total) || 0;
            monthlyMap.set(m, (monthlyMap.get(m) || 0) + rev);
          } else {
            monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1);
          }
        });
      }

      if (type === "revenue") {
        return MONTHS_SHORT.map((m) => ({
          month: m,
          revenue: (monthlyMap.get(m) || 0).toFixed(2),
        }));
      } else {
        return MONTHS_SHORT.map((m) => ({
          month: m,
          invoices: monthlyMap.get(m) || 0,
        }));
      }
    }

    if (type === "products") {
      const usersSnap = await db.collection("users").get();
      for (const userDoc of usersSnap.docs) {
        const prodSnap = await db.collection(`users/${userDoc.id}/products`).get();
        prodSnap.forEach((pDoc) => {
          const data = pDoc.data();
          const d = data.createdAt ? new Date(data.createdAt) : null;
          if (d && d.getFullYear() === currentYear) {
            const m = MONTHS_SHORT[d.getMonth()];
            monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1);
          }
        });
      }
      return MONTHS_SHORT.map((m) => ({
        month: m,
        products: monthlyMap.get(m) || 0,
      }));
    }

    throw new HttpsError("invalid-argument", "Invalid analytics type.");
  }
);
