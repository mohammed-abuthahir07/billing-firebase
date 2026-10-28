import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

/**
 * AdminProtectedRoute — wraps admin routes.
 * Waits for Firebase Auth to resolve before deciding.
 * If still loading → show spinner (prevents redirect loop).
 * If no admin session → redirect to /admin/login.
 * Otherwise → render children.
 */
const AdminProtectedRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="app-route-fallback" role="status" aria-live="polite">
        <div className="app-route-fallback-inner">
          <div className="app-route-spinner" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
