import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("fleet_token");
  if (t) cfg.headers["Authorization"] = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      const path = window.location.pathname;
      // Only redirect if we had a token
      if (localStorage.getItem("fleet_token")) {
        localStorage.removeItem("fleet_token");
        localStorage.removeItem("fleet_user");
        if (!path.startsWith("/track") && !path.startsWith("/register") && !path.startsWith("/login") && path !== "/" && !path.startsWith("/admin/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);
