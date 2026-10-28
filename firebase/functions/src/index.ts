import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

export { createInvoice } from "./billing/createInvoice";
export { deleteProduct } from "./products/deleteProduct";
export { getMonthlyReportSummary } from "./reports/monthlyReports";
export { getAdminDashboard } from "./admin/adminDashboard";
export { getAdminCompanies, getAdminCompanyDetails } from "./admin/adminCompanies";
export { getAdminAnalytics } from "./admin/adminAnalytics";
export { setAdminClaim } from "./admin/setAdminClaim";
