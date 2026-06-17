import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="label-overline">Loading workspace…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && roles.length) {
    const ok = user.roles.includes("super_admin") || user.roles.some((r) => roles.includes(r));
    if (!ok) {
      // Redirect to role's natural home
      if (user.roles.includes("driver")) return <Navigate to="/driver" replace />;
      if (user.roles.includes("customer")) return <Navigate to="/portal" replace />;
      return <Navigate to="/app/dashboard" replace />;
    }
  }
  return children;
}
