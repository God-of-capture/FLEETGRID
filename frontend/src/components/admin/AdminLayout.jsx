import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Truck, SignOut, Buildings, Users, Package, CreditCard, ChartBar, Motorcycle } from "@phosphor-icons/react";

const NAV = [
  { to: "/admin", label: "Overview", Icon: ChartBar, end: true },
  { to: "/admin/organizations", label: "Organizations", Icon: Buildings },
  { to: "/admin/partners", label: "Partners", Icon: Motorcycle },
  { to: "/admin/deliveries", label: "Deliveries", Icon: Package },
  { to: "/admin/subscriptions", label: "Subscriptions", Icon: CreditCard },
  { to: "/admin/users", label: "Users", Icon: Users },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800 bg-black">
        <div className="p-6 border-b border-slate-800">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 flex items-center justify-center">
              <Truck size={16} weight="fill" color="white" />
            </div>
            <div>
              <div className="font-heading font-bold text-sm">FLEETGRID</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Admin</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm transition-colors ${
                  isActive ? "bg-red-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          {user?.email}
          <Button variant="ghost" size="sm" className="w-full mt-2 text-slate-400 hover:text-white" onClick={() => { logout(); navigate("/admin/login"); }}>
            <SignOut size={14} className="mr-1" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="lg:hidden border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="font-heading font-bold">Admin</div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/admin/login"); }}><SignOut size={16} /></Button>
        </header>
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function AdminTable({ columns, rows, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  if (!rows?.length) return <div className="border border-slate-800 p-12 text-center text-slate-500">No records.</div>;
  return (
    <div className="border border-slate-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-slate-400 text-left">
          <tr>{columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-slate-900/50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-slate-300">{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function useAdminData(path, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.get(path, { params }).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [path, params]);
  return { data, loading };
}
