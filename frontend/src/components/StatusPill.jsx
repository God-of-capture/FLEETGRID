import { Badge } from "./ui/badge";
import React from "react";

const map = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  offered: { label: "Offered", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  assigned: { label: "Assigned", cls: "bg-slate-100 text-slate-800 border-slate-300" },
  picked_up: { label: "Picked up", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_transit: { label: "In transit", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  out_for_delivery: { label: "Out for delivery", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivered: { label: "Delivered", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", cls: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  available: { label: "Available", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  on_trip: { label: "On trip", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  off_duty: { label: "Off duty", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  in_use: { label: "In use", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  maintenance: { label: "Maintenance", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  retired: { label: "Retired", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

export function StatusPill({ status }) {
  const s = map[status] || { label: status, cls: "bg-slate-100 text-slate-700 border-slate-300" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${s.cls} px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded-sm`}
      data-testid={`status-${status}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {s.label}
    </span>
  );
}
