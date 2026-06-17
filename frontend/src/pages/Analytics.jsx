import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#002FA7","#3B82F6","#10B981","#F59E0B","#EF4444","#0A0A0A","#94A3B8","#6366F1"];

export default function Analytics() {
  const [s, setS] = useState(null);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    api.get("/dashboard/summary").then(r => setS(r.data));
    api.get("/drivers").then(r => setDrivers(r.data));
  }, []);

  if (!s) return <div className="p-12 text-center text-slate-500">Loading analytics…</div>;

  const driverPerf = drivers.map(d => ({
    name: d.full_name.split(" ")[0],
    delivered: d.deliveries_completed,
    rating: d.rating,
  }));

  return (
    <div className="space-y-8" data-testid="analytics-page">
      <div>
        <div className="label-overline">Insights</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-6">
          <div className="label-overline">Delivery throughput (7d)</div>
          <h3 className="font-heading text-lg font-semibold mt-1 mb-4">Created vs delivered</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={s.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 4 }} />
              <Legend />
              <Bar dataKey="created" fill="#0A0A0A" />
              <Bar dataKey="delivered" fill="#002FA7" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 p-6">
          <div className="label-overline">Status mix</div>
          <h3 className="font-heading text-lg font-semibold mt-1 mb-4">Pipeline distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={s.status_breakdown} dataKey="count" nameKey="status" innerRadius={50} outerRadius={100} paddingAngle={2}>
                {s.status_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 p-6 lg:col-span-2">
          <div className="label-overline">Driver efficiency</div>
          <h3 className="font-heading text-lg font-semibold mt-1 mb-4">Deliveries completed per driver</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 4 }} />
              <Bar dataKey="delivered" fill="#002FA7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
