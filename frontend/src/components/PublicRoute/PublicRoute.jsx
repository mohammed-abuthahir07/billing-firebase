import React, { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const LandingPage = lazy(() => import("../../pages/LandingPage/LandingPage"));

const RouteFallback = () => (
  <div className="app-route-fallback" role="status" aria-live="polite">
    <div className="app-route-fallback-inner">
      <div className="app-route-spinner" />
      <span>Loading…</span>
    </div>
  </div>
);

/**
 * PublicRoute — the "/" landing page.
 * Waits for auth to resolve before deciding.
 * If user is logged in → send to /dashboard.
 * Otherwise → show landing page.
 */
const PublicRoute = () => {
  const { user, loading } = useAuth();

  // Don't redirect until Firebase Auth has resolved
  if (loading) {
    return <RouteFallback />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <LandingPage />
    </Suspense>
  );
};

export default PublicRoute;
