import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "./components/ui/sonner";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Fleet from "./pages/Fleet";
import Drivers from "./pages/Drivers";
import Customers from "./pages/Customers";
import Deliveries from "./pages/Deliveries";
import DeliveryDetail from "./pages/DeliveryDetail";
import LiveMap from "./pages/LiveMap";
import Settings from "./pages/Settings";
import Audit from "./pages/Audit";
import Analytics from "./pages/Analytics";
import DriverPortal from "./pages/DriverPortal";
import CustomerPortal from "./pages/CustomerPortal";
import PublicTracking from "./pages/PublicTracking";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.roles.includes("driver") && !user.roles.includes("org_owner"))
    return <Navigate to="/driver" replace />;
  if (user.roles.includes("customer") && user.roles.length === 1)
    return <Navigate to="/portal" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

const OPS = ["org_owner", "ops_manager", "dispatcher"];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/track" element={<PublicTracking />} />
          <Route path="/track/:code" element={<PublicTracking />} />

          {/* Driver portal */}
          <Route path="/driver" element={
            <ProtectedRoute roles={["driver"]}><DriverPortal /></ProtectedRoute>
          } />

          {/* Customer portal */}
          <Route path="/portal" element={
            <ProtectedRoute roles={["customer"]}><CustomerPortal /></ProtectedRoute>
          } />

          {/* Operator app (org_owner / ops_manager / dispatcher) */}
          <Route path="/app/dashboard" element={
            <ProtectedRoute roles={OPS}><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/app/fleet" element={
            <ProtectedRoute roles={["org_owner","ops_manager"]}><Layout><Fleet /></Layout></ProtectedRoute>
          } />
          <Route path="/app/drivers" element={
            <ProtectedRoute roles={OPS}><Layout><Drivers /></Layout></ProtectedRoute>
          } />
          <Route path="/app/customers" element={
            <ProtectedRoute roles={OPS}><Layout><Customers /></Layout></ProtectedRoute>
          } />
          <Route path="/app/deliveries" element={
            <ProtectedRoute roles={OPS}><Layout><Deliveries /></Layout></ProtectedRoute>
          } />
          <Route path="/app/deliveries/:id" element={
            <ProtectedRoute roles={OPS}><Layout><DeliveryDetail /></Layout></ProtectedRoute>
          } />
          <Route path="/app/live-map" element={
            <ProtectedRoute roles={OPS}><Layout><LiveMap /></Layout></ProtectedRoute>
          } />
          <Route path="/app/analytics" element={
            <ProtectedRoute roles={["org_owner","ops_manager"]}><Layout><Analytics /></Layout></ProtectedRoute>
          } />
          <Route path="/app/settings" element={
            <ProtectedRoute roles={["org_owner"]}><Layout><Settings /></Layout></ProtectedRoute>
          } />
          <Route path="/app/audit" element={
            <ProtectedRoute roles={["org_owner"]}><Layout><Audit /></Layout></ProtectedRoute>
          } />

          <Route path="/home" element={<RoleHome />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
