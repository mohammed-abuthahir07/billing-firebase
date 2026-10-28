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
exports.getMonthlyReportSummary = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
exports.getMonthlyReportSummary = (0, https_1.onCall)({ cors: true }, async (request) => {
    const auth = request.auth;
    if (!auth || !auth.uid) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated.");
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
    const productSalesMap = new Map();
    invoicesSnapshot.forEach((doc) => {
        const data = doc.data();
        totalRevenue += Number(data.grand_total) || 0;
        totalSubtotal += Number(data.subtotal) || 0;
        totalGst += Number(data.gst_amount) || 0;
        if (Array.isArray(data.items)) {
            data.items.forEach((item) => {
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
    let bestSellingProduct = null;
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
});
//# sourceMappingURL=monthlyReports.js.map