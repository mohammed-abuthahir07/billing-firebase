"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminCompanyDetails = exports.getAdminCompanies = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.getAdminCompanies = (0, https_1.onCall)({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
        throw new https_1.HttpsError("permission-denied", "Access Denied. Admin only.");
    }
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();
    const companies = await Promise.all(usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const userId = doc.id;
        // Fetch company profile
        const profileSnap = await db.doc(`users/${userId}/profile/company`).get();
        const profileData = profileSnap.exists ? profileSnap.data() : null;
        // Fetch stats
        const statsSnap = await db.doc(`users/${userId}/stats/dashboard`).get();
        const statsData = statsSnap.exists ? statsSnap.data() : null;
        // Fetch counts
        const productsCount = (await db.collection(`users/${userId}/products`).count().get()).data().count;
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
    }));
    return {
        success: true,
        totalCompanies: companies.length,
        companies,
    };
});
exports.getAdminCompanyDetails = (0, https_1.onCall)({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
        throw new https_1.HttpsError("permission-denied", "Access Denied. Admin only.");
    }
    const { id: companyId } = request.data;
    if (!companyId) {
        throw new https_1.HttpsError("invalid-argument", "Company ID is required.");
    }
    const db = admin.firestore();
    const userDoc = await db.doc(`users/${companyId}`).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "Company not found");
    }
    const userData = userDoc.data();
    const profileSnap = await db.doc(`users/${companyId}/profile/company`).get();
    const profileData = profileSnap.exists ? profileSnap.data() : null;
    const statsSnap = await db.doc(`users/${companyId}/stats/dashboard`).get();
    const statsData = statsSnap.exists ? statsSnap.data() : null;
    const productsCount = (await db.collection(`users/${companyId}/products`).count().get()).data().count;
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
});
//# sourceMappingURL=adminCompanies.js.map