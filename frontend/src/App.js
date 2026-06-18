import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "./components/ui/sonner";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
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
import DriverJobs from "./pages/DriverJobs";
import PartnerOnboarding from "./pages/PartnerOnboarding";
import VerificationQueue from "./pages/VerificationQueue";
import CustomerPortal from "./pages/CustomerPortal";
import SendParcel from "./pages/SendParcel";
import PublicTracking from "./pages/PublicTracking";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import { LoginBusiness, LoginCustomer, LoginDriver, LoginAdmin, LoginRedirect } from "./pages/auth/LoginRoutes";
import { RegisterRedirect, SignupIndividualRedirect } from "./pages/auth/RegisterRoutes";
import RegisterBusiness from "./components/auth/RegisterBusiness";
import RegisterCustomer from "./components/auth/RegisterCustomer";
import RegisterDriver from "./components/auth/RegisterDriver";

import AdminOverview from "./pages/admin/AdminOverview";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminDeliveries from "./pages/admin/AdminDeliveries";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminUsers from "./pages/admin/AdminUsers";

function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.roles.includes("super_admin")) return <Navigate to="/admin" replace />;
  if (user.roles.includes("driver") && !user.roles.includes("org_owner"))
    return <Navigate to="/driver/jobs" replace />;
  if (user.roles.includes("customer") && !user.roles.some((r) => ["org_owner", "ops_manager", "dispatcher"].includes(r)))
    return <Navigate to={user.roles.includes("individual_customer") ? "/send-parcel" : "/portal"} replace />;
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

          {/* Persona login */}
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/login/business" element={<LoginBusiness />} />
          <Route path="/login/customer" element={<LoginCustomer />} />
          <Route path="/login/driver" element={<LoginDriver />} />
          <Route path="/admin/login" element={<LoginAdmin />} />

          {/* Persona registration */}
          <Route path="/register" element={<RegisterRedirect />} />
          <Route path="/register/business" element={<RegisterBusiness />} />
          <Route path="/register/customer" element={<RegisterCustomer />} />
          <Route path="/register/driver" element={<RegisterDriver />} />
          <Route path="/signup/individual" element={<SignupIndividualRedirect />} />

          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/track" element={<PublicTracking />} />
          <Route path="/track/:code" element={<PublicTracking />} />

          {/* Driver */}
          <Route path="/driver" element={<ProtectedRoute roles={["driver"]}><DriverJobs /></ProtectedRoute>} />
          <Route path="/driver/jobs" element={<ProtectedRoute roles={["driver"]}><DriverJobs /></ProtectedRoute>} />
          <Route path="/partner/onboarding" element={<ProtectedRoute roles={["driver"]}><PartnerOnboarding /></ProtectedRoute>} />

          {/* Customer */}
          <Route path="/portal" element={<ProtectedRoute roles={["customer"]}><CustomerPortal /></ProtectedRoute>} />
          <Route path="/send-parcel" element={<ProtectedRoute roles={["customer"]}><SendParcel /></ProtectedRoute>} />

          {/* Operator app */}
          <Route path="/app/dashboard" element={<ProtectedRoute roles={OPS}><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/app/fleet" element={<ProtectedRoute roles={["org_owner","ops_manager"]}><Layout><Fleet /></Layout></ProtectedRoute>} />
          <Route path="/app/drivers" element={<ProtectedRoute roles={OPS}><Layout><Drivers /></Layout></ProtectedRoute>} />
          <Route path="/app/customers" element={<ProtectedRoute roles={OPS}><Layout><Customers /></Layout></ProtectedRoute>} />
          <Route path="/app/deliveries" element={<ProtectedRoute roles={OPS}><Layout><Deliveries /></Layout></ProtectedRoute>} />
          <Route path="/app/deliveries/:id" element={<ProtectedRoute roles={OPS}><Layout><DeliveryDetail /></Layout></ProtectedRoute>} />
          <Route path="/app/live-map" element={<ProtectedRoute roles={OPS}><Layout><LiveMap /></Layout></ProtectedRoute>} />
          <Route path="/app/analytics" element={<ProtectedRoute roles={["org_owner","ops_manager"]}><Layout><Analytics /></Layout></ProtectedRoute>} />
          <Route path="/app/settings" element={<ProtectedRoute roles={["org_owner"]}><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="/app/audit" element={<ProtectedRoute roles={["org_owner"]}><Layout><Audit /></Layout></ProtectedRoute>} />
          <Route path="/app/verification" element={<ProtectedRoute roles={["org_owner", "ops_manager"]}><Layout><VerificationQueue /></Layout></ProtectedRoute>} />

          {/* Platform admin */}
          <Route path="/admin" element={<ProtectedRoute roles={["super_admin"]}><AdminOverview /></ProtectedRoute>} />
          <Route path="/admin/organizations" element={<ProtectedRoute roles={["super_admin"]}><AdminOrganizations /></ProtectedRoute>} />
          <Route path="/admin/partners" element={<ProtectedRoute roles={["super_admin"]}><AdminPartners /></ProtectedRoute>} />
          <Route path="/admin/deliveries" element={<ProtectedRoute roles={["super_admin"]}><AdminDeliveries /></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={<ProtectedRoute roles={["super_admin"]}><AdminSubscriptions /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={["super_admin"]}><AdminUsers /></ProtectedRoute>} />

          <Route path="/home" element={<RoleHome />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
