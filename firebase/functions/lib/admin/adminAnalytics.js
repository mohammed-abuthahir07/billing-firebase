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
exports.getAdminAnalytics = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
exports.getAdminAnalytics = (0, https_1.onCall)({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
        throw new https_1.HttpsError("permission-denied", "Access Denied. Admin only.");
    }
    const { type } = request.data;
    const db = admin.firestore();
    const currentYear = new Date().getFullYear();
    const monthlyMap = new Map();
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
                }
                else {
                    monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1);
                }
            });
        }
        if (type === "revenue") {
            return MONTHS_SHORT.map((m) => ({
                month: m,
                revenue: (monthlyMap.get(m) || 0).toFixed(2),
            }));
        }
        else {
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
    throw new https_1.HttpsError("invalid-argument", "Invalid analytics type.");
});
//# sourceMappingURL=adminAnalytics.js.map