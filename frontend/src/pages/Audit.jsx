import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Audit() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audit-logs").then(r => setLogs(r.data)).catch(()=>{}); }, []);

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div>
        <div className="label-overline">Compliance</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Audit logs</h1>
      </div>
      <div className="bg-white border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="label-overline text-left">
              <th className="px-6 py-3">When</th>
              <th className="px-6 py-3">Actor</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Resource</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No events yet.</td></tr>}
            {logs.map(l => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="px-6 py-3 font-mono-tabular text-xs text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-6 py-3">{l.actor_email || "system"}</td>
                <td className="px-6 py-3 font-mono-tabular">{l.action}</td>
                <td className="px-6 py-3 text-slate-600">{l.resource}{l.resource_id ? ` / ${l.resource_id.slice(0,8)}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
