import React from "react";
import AdminLayout, { useAdminData } from "../../components/admin/AdminLayout";
import { Skeleton } from "../../components/ui/skeleton";

export default function AdminOverview() {
  const { data, loading } = useAdminData("/admin/overview");

  if (loading) return <AdminLayout><Skeleton className="h-64" /></AdminLayout>;

  const kpis = [
    ["Organizations", data?.organizations],
    ["Users", data?.users],
    ["Drivers", data?.drivers],
    ["Deliveries", data?.deliveries],
    ["Pending verifications", data?.pending_verifications],
    ["Paid plans", data?.active_subscriptions],
  ];

  return (
    <AdminLayout>
      <div className="label-overline text-red-500">Platform</div>
      <h1 className="font-heading text-3xl font-bold mt-2">System overview</h1>
      <p className="text-slate-400 text-sm mt-2">Cross-tenant analytics — all actions are audit logged.</p>
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="border border-slate-800 bg-slate-900/50 p-6">
            <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
            <div className="font-heading text-3xl font-bold mt-2 font-mono-tabular">{value ?? "—"}</div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
