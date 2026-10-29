import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import AdminProtectedRoute from "./admin/routes/AdminProtectedRoute";
import AdminLayout from "./admin/layouts/AdminLayout";
import PublicRoute from "./components/PublicRoute/PublicRoute";

const AuthModal = lazy(() => import("./components/AuthModal/AuthModal"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Products = lazy(() => import("./pages/Products/Products"));
const Bill = lazy(() => import("./pages/Bills/Bill"));
const Login = lazy(() => import("./pages/Login/Login"));
const Register = lazy(() => import("./pages/Register/Register"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const Reports = lazy(() => import("./pages/Reports/Reports"));
const UserAnalytics = lazy(() => import("./pages/Analytics/Analytics"));
const AdminLogin = lazy(() => import("./admin/pages/AdminLogin/AdminLogin"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard/AdminDashboard"));
const Companies = lazy(() => import("./admin/pages/Companies/Companies"));
const CompanyDetails = lazy(() => import("./admin/pages/CompanyDetails/CompanyDetails"));
const Analytics = lazy(() => import("./admin/pages/Analytics/Analytics"));
const AdminInvoices = lazy(() => import("./admin/pages/Invoices/AdminInvoices"));
const AdminProducts = lazy(() => import("./admin/pages/Products/AdminProducts"));
const AdminSettings = lazy(() => import("./admin/pages/Settings/AdminSettings"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword/ForgotPassword"));
const VerifyOTP = lazy(() => import("./pages/ForgotPassword/VerifyOTP"));
const ResetPassword = lazy(() => import("./pages/ForgotPassword/ResetPassword"));

function RouteFallback() {
  return (
    <div className="app-route-fallback" role="status" aria-live="polite">
      <div className="app-route-fallback-inner">
        <div className="app-route-spinner" />
        <span>Loading…</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Protected routes — require login */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/bills" element={<Bill />} />
                <Route path="/analytics" element={<UserAnalytics />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="companies" element={<Companies />} />
              <Route path="companies/:id" element={<CompanyDetails />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Public pages */}
            <Route path="/" element={<PublicRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
    </>
  );
}

export default App;
