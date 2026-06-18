import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/ui/skeleton";
import { Package, Truck, UserCircle, ChartLineUp, ArrowUpRight } from "@phosphor-icons/react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [ops, setOps] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get("/dashboard/summary").then((r) => setS(r.data));
    api.get("/dashboard/operations").then((r) => setOps(r.data)).catch(() => {});
    api.get("/deliveries").then((r) => setRecent(r.data.slice(0, 6)));
  }, []);

  if (!s) return <div className="space-y-6"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;

  const kpis = [
    { label: "Deliveries today", value: s.deliveries_today, I: Package, accent: "#002FA7" },
    { label: "In transit", value: s.in_transit, I: Truck, accent: "#3B82F6" },
    { label: "Active drivers", value: `${s.active_drivers}/${s.total_drivers}`, I: UserCircle, accent: "#10B981" },
    { label: "Revenue (₹)", value: Number(s.revenue || 0).toLocaleString("en-IN"), I: ChartLineUp, accent: "#0A0A0A" },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-root">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-overline">Operations overview</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Today, at a glance.</h1>
        </div>
        <Link to="/app/deliveries" className="text-sm text-[#002FA7] hover:underline inline-flex items-center gap-1">
          See all deliveries <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-200">
        {kpis.map(({ label, value, I, accent }) => (
          <div key={label} className="border-r border-b border-slate-200 p-6 bg-white">
            <div className="flex items-start justify-between">
              <div className="label-overline">{label}</div>
              <I size={18} weight="duotone" color={accent} />
            </div>
            <div className="mt-4 font-heading text-3xl font-bold tracking-tight font-mono-tabular">{value}</div>
          </div>
        ))}
      </div>

      {ops && (
        <div className="grid grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-200">
          {[
            { label: "Pending verifications", value: ops.pending_verifications },
            { label: "Active offers", value: ops.active_offers },
            { label: "Available drivers", value: ops.available_drivers },
            { label: "Avg driver rating", value: ops.driver_ratings?.avg_rating?.toFixed(1) || "5.0" },
          ].map(({ label, value }) => (
            <div key={label} className="border-r border-b border-slate-200 p-6 bg-white">
              <div className="label-overline">{label}</div>
              <div className="mt-4 font-heading text-3xl font-bold font-mono-tabular">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-overline">Last 7 days</div>
              <h3 className="font-heading text-lg font-semibold mt-1">Delivery throughput</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={s.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 4, fontSize: 12 }} />
              <Line type="monotone" dataKey="created" stroke="#0A0A0A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="delivered" stroke="#002FA7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 p-6">
          <div className="label-overline">Status breakdown</div>
          <h3 className="font-heading text-lg font-semibold mt-1 mb-4">Pipeline</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.status_breakdown} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="status" stroke="#94A3B8" fontSize={10} angle={-25} textAnchor="end" height={50} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="count" fill="#002FA7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent deliveries */}
      <div className="bg-white border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="label-overline">Live feed</div>
            <h3 className="font-heading text-lg font-semibold mt-1">Recent deliveries</h3>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {recent.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No deliveries yet.</div>}
          {recent.map((d) => (
            <Link
              key={d.id} to={`/app/deliveries/${d.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
              data-testid={`recent-delivery-${d.id}`}
            >
              <div className="font-mono-tabular text-xs text-slate-500 w-32 truncate">{d.tracking_code}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.customer_name}</div>
                <div className="text-xs text-slate-500 truncate">→ {d.drop_address}</div>
              </div>
              <StatusPill status={d.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
