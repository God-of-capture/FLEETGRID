import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="label-overline">Loading…</div>
      </div>
    );
  }

  if (!user) {
    if (isAdminRoute) return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login/business" replace />;
  }

  if (roles && roles.length) {
    const ok = user.roles.includes("super_admin") || user.roles.some((r) => roles.includes(r));
    if (!ok) {
      if (user.roles.includes("super_admin")) return <Navigate to="/admin" replace />;
      if (user.roles.includes("driver")) return <Navigate to="/driver/jobs" replace />;
      if (user.roles.includes("customer")) return <Navigate to="/portal" replace />;
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return children;
}
