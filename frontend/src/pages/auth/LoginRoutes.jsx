import React from "react";
import { Navigate } from "react-router-dom";
import LoginPersona from "../../components/auth/LoginPersona";

export function LoginBusiness() { return <LoginPersona personaId="business" />; }
export function LoginCustomer() { return <LoginPersona personaId="customer" />; }
export function LoginDriver() { return <LoginPersona personaId="driver" />; }
export function LoginAdmin() { return <LoginPersona personaId="admin" />; }

export function LoginRedirect() {
  return <Navigate to="/login/business" replace />;
}
