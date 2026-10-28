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
exports.getAdminDashboard = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.getAdminDashboard = (0, https_1.onCall)({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth || !auth.token?.admin) {
        throw new https_1.HttpsError("permission-denied", "Access Denied. Admin only.");
    }
    const db = admin.firestore();
    const overviewDoc = await db.doc("platform_stats/overview").get();
    const overviewData = overviewDoc.exists ? overviewDoc.data() : {};
    // Also get active counts if overview doc is fresh/empty
    const usersCount = (await db.collection("users").count().get()).data().count;
    return {
        totalUsers: usersCount || overviewData.totalUsers || 0,
        totalProducts: overviewData.totalProducts || 0,
        totalInvoices: overviewData.totalInvoices || 0,
        totalRevenue: String((Number(overviewData.totalRevenue) || 0).toFixed(2)),
        monthlyRevenue: String((Number(overviewData.monthlyRevenue) || 0).toFixed(2)),
    };
});
//# sourceMappingURL=adminDashboard.js.map