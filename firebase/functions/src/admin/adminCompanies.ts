import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getAdminCompanies = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
      throw new HttpsError("permission-denied", "Access Denied. Admin only.");
    }

    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();

    const companies = await Promise.all(
      usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const userId = doc.id;

        // Fetch company profile
        const profileSnap = await db.doc(`users/${userId}/profile/company`).get();
        const profileData = profileSnap.exists ? profileSnap.data() : null;

        // Fetch stats
        const statsSnap = await db.doc(`users/${userId}/stats/dashboard`).get();
        const statsData = statsSnap.exists ? statsSnap.data() : null;

        // Fetch counts
        const productsCount = (
          await db.collection(`users/${userId}/products`).count().get()
        ).data().count;

        const totalInvoices = statsData?.totalBills || 0;
        const totalRevenue = String((Number(statsData?.totalRevenue) || 0).toFixed(2));
        const monthlyRevenue = String((Number(statsData?.monthlySales) || 0).toFixed(2));
        const yearlyRevenue = String((Number(statsData?.yearlySales) || 0).toFixed(2));

        return {
          id: userId,
          name: profileData?.companyName || userData.name || "Business User",
          email: userData.email || "",
          created_at: userData.createdAt || new Date().toISOString(),
          totalProducts: productsCount,
          totalInvoices: totalInvoices,
          monthlyRevenue: monthlyRevenue,
          yearlyRevenue: yearlyRevenue,
          totalRevenue: totalRevenue,
        };
      })
    );

    return {
      success: true,
      totalCompanies: companies.length,
      companies,
    };
  }
);

export const getAdminCompanyDetails = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
      throw new HttpsError("permission-denied", "Access Denied. Admin only.");
    }

    const { id: companyId } = request.data as { id: string };
    if (!companyId) {
      throw new HttpsError("invalid-argument", "Company ID is required.");
    }

    const db = admin.firestore();
    const userDoc = await db.doc(`users/${companyId}`).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Company not found");
    }

    const userData = userDoc.data()!;
    const profileSnap = await db.doc(`users/${companyId}/profile/company`).get();
    const profileData = profileSnap.exists ? profileSnap.data() : null;

    const statsSnap = await db.doc(`users/${companyId}/stats/dashboard`).get();
    const statsData = statsSnap.exists ? statsSnap.data() : null;

    const productsCount = (
      await db.collection(`users/${companyId}/products`).count().get()
    ).data().count;

    // Recent 10 invoices
    const recentInvoicesSnap = await db
      .collection(`users/${companyId}/invoices`)
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    const recentInvoices = recentInvoicesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        invoice_number: data.invoice_number,
        customer_name: data.customer_name,
        grand_total: data.grand_total,
        created_at: data.created_at,
      };
    });

    return {
      success: true,
      company: {
        id: companyId,
        name: profileData?.companyName || userData.name || "Business User",
        email: userData.email,
        created_at: userData.createdAt,
        totalInvoices: statsData?.totalBills || 0,
        totalRevenue: String((Number(statsData?.totalRevenue) || 0).toFixed(2)),
        totalProducts: productsCount,
        monthlyRevenue: String((Number(statsData?.monthlySales) || 0).toFixed(2)),
      },
      recentInvoices,
    };
  }
);
