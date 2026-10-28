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
exports.setAdminClaim = exports.getAdminAnalytics = exports.getAdminCompanyDetails = exports.getAdminCompanies = exports.getAdminDashboard = exports.getMonthlyReportSummary = exports.deleteProduct = exports.createInvoice = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
var createInvoice_1 = require("./billing/createInvoice");
Object.defineProperty(exports, "createInvoice", { enumerable: true, get: function () { return createInvoice_1.createInvoice; } });
var deleteProduct_1 = require("./products/deleteProduct");
Object.defineProperty(exports, "deleteProduct", { enumerable: true, get: function () { return deleteProduct_1.deleteProduct; } });
var monthlyReports_1 = require("./reports/monthlyReports");
Object.defineProperty(exports, "getMonthlyReportSummary", { enumerable: true, get: function () { return monthlyReports_1.getMonthlyReportSummary; } });
var adminDashboard_1 = require("./admin/adminDashboard");
Object.defineProperty(exports, "getAdminDashboard", { enumerable: true, get: function () { return adminDashboard_1.getAdminDashboard; } });
var adminCompanies_1 = require("./admin/adminCompanies");
Object.defineProperty(exports, "getAdminCompanies", { enumerable: true, get: function () { return adminCompanies_1.getAdminCompanies; } });
Object.defineProperty(exports, "getAdminCompanyDetails", { enumerable: true, get: function () { return adminCompanies_1.getAdminCompanyDetails; } });
var adminAnalytics_1 = require("./admin/adminAnalytics");
Object.defineProperty(exports, "getAdminAnalytics", { enumerable: true, get: function () { return adminAnalytics_1.getAdminAnalytics; } });
var setAdminClaim_1 = require("./admin/setAdminClaim");
Object.defineProperty(exports, "setAdminClaim", { enumerable: true, get: function () { return setAdminClaim_1.setAdminClaim; } });
//# sourceMappingURL=index.js.map