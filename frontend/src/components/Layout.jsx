import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import {
  House, Truck, Users, UserCircle, Package, MapTrifold,
  ChartBar, Gear, SignOut, Bell, ClipboardText,
} from "@phosphor-icons/react";

const navByRole = {
  org_owner: [
    { to: "/app/dashboard", label: "Dashboard", Icon: House },
    { to: "/app/deliveries", label: "Deliveries", Icon: Package },
    { to: "/app/live-map", label: "Live Map", Icon: MapTrifold },
    { to: "/app/fleet", label: "Fleet", Icon: Truck },
    { to: "/app/drivers", label: "Drivers", Icon: UserCircle },
    { to: "/app/customers", label: "Customers", Icon: Users },
    { to: "/app/analytics", label: "Analytics", Icon: ChartBar },
    { to: "/app/audit", label: "Audit Logs", Icon: ClipboardText },
    { to: "/app/settings", label: "Settings", Icon: Gear },
  ],
  ops_manager: [
    { to: "/app/dashboard", label: "Dashboard", Icon: House },
    { to: "/app/deliveries", label: "Deliveries", Icon: Package },
    { to: "/app/live-map", label: "Live Map", Icon: MapTrifold },
    { to: "/app/fleet", label: "Fleet", Icon: Truck },
    { to: "/app/drivers", label: "Drivers", Icon: UserCircle },
    { to: "/app/customers", label: "Customers", Icon: Users },
    { to: "/app/analytics", label: "Analytics", Icon: ChartBar },
  ],
  dispatcher: [
    { to: "/app/dashboard", label: "Dashboard", Icon: House },
    { to: "/app/deliveries", label: "Deliveries", Icon: Package },
    { to: "/app/live-map", label: "Live Map", Icon: MapTrifold },
    { to: "/app/drivers", label: "Drivers", Icon: UserCircle },
    { to: "/app/customers", label: "Customers", Icon: Users },
  ],
  driver: [
    { to: "/driver", label: "My Deliveries", Icon: Package },
  ],
  customer: [
    { to: "/portal", label: "My Orders", Icon: Package },
  ],
};

export default function Layout({ children }) {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.roles?.[0] || "customer";
  const items = navByRole[role] || navByRole.customer;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200">
        <div className="px-6 py-5 border-b border-slate-200">
          <Link to="/app/dashboard" className="flex items-center gap-2" data-testid="sidebar-logo">
            <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
              <Truck size={18} weight="fill" color="white" />
            </div>
            <div>
              <div className="font-heading font-bold text-[15px] leading-none">FLEETGRID</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mt-1">
                {organization?.name || "Operations"}
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-[#0A0A0A] text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-[#0A0A0A]"
                }`
              }
            >
              <Icon size={18} weight="regular" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-[#002FA7] text-white flex items-center justify-center text-sm font-semibold">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name}</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500">
                {role.replace("_", " ")}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start mt-1 text-slate-600"
            onClick={() => { logout(); navigate("/login"); }}
            data-testid="logout-btn"
          >
            <SignOut size={16} className="mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass-header px-4 py-3 flex items-center justify-between">
        <Link to="/app/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#002FA7] flex items-center justify-center">
            <Truck size={14} weight="fill" color="white" />
          </div>
          <span className="font-heading font-bold text-sm">FLEETGRID</span>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }}>
          <SignOut size={16} />
        </Button>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 lg:pl-0 pt-14 lg:pt-0">
        <header className="hidden lg:flex glass-header sticky top-0 z-20 h-14 px-8 items-center justify-between">
          <div className="label-overline">
            {organization?.name ? `${organization.name} / ${role.replace("_", " ")}` : "Console"}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" data-testid="notifications-btn">
              <Bell size={18} />
            </Button>
          </div>
        </header>
        <div className="px-4 lg:px-8 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
