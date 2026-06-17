import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fleet_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [organization, setOrganization] = useState(() => {
    const raw = localStorage.getItem("fleet_org");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fleet_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("fleet_user", JSON.stringify(res.data));
        return api.get("/auth/organization");
      })
      .then((res) => {
        if (res && res.data) {
          setOrganization(res.data);
          localStorage.setItem("fleet_org", JSON.stringify(res.data));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("fleet_token", res.data.access_token);
    localStorage.setItem("fleet_user", JSON.stringify(res.data.user));
    if (res.data.organization)
      localStorage.setItem("fleet_org", JSON.stringify(res.data.organization));
    setUser(res.data.user);
    setOrganization(res.data.organization);
    return res.data;
  };

  const registerOrg = async (payload) => {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("fleet_token", res.data.access_token);
    localStorage.setItem("fleet_user", JSON.stringify(res.data.user));
    if (res.data.organization)
      localStorage.setItem("fleet_org", JSON.stringify(res.data.organization));
    setUser(res.data.user);
    setOrganization(res.data.organization);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("fleet_token");
    localStorage.removeItem("fleet_user");
    localStorage.removeItem("fleet_org");
    setUser(null);
    setOrganization(null);
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.roles.includes("super_admin")) return true;
    return user.roles.some((r) => roles.includes(r));
  };

  return (
    <AuthCtx.Provider
      value={{ user, organization, loading, login, registerOrg, logout, hasRole }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
