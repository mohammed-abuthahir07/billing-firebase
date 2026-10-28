import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Waits for Firebase Auth to finish resolving before deciding.
 * If auth is still loading → render nothing (avoids redirect loop).
 * If user is not logged in → redirect to home.
 * Otherwise → render child routes via <Outlet />.
 */
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // Auth is still resolving — don't redirect yet
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
