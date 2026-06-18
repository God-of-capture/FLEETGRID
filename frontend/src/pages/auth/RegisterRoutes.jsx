import { Navigate } from "react-router-dom";

export function RegisterRedirect() {
  return <Navigate to="/register/business" replace />;
}

export function SignupIndividualRedirect() {
  return <Navigate to="/register/customer" replace />;
}
