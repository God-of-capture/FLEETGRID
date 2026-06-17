import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { StatusPill } from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { Truck, SignOut } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/deliveries").then(r => setItems(r.data.filter(d => d.customer_name === user?.full_name || true))); }, [user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#002FA7] flex items-center justify-center"><Truck size={14} weight="fill" color="white" /></div>
            <div className="font-heading font-bold text-sm">MY ORDERS</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><SignOut size={16} /></Button>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="label-overline">Hi {user?.full_name?.split(" ")[0]}</div>
            <h1 className="font-heading text-3xl font-bold mt-1">Your shipments</h1>
          </div>
          <Link to="/send-parcel"><Button className="btn-brand" data-testid="send-parcel-cta">+ Send a parcel</Button></Link>
        </div>
        {items.length === 0 && <div className="bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">No shipments.</div>}
        <div className="space-y-3">
          {items.map(d => (
            <Link to={`/track/${d.tracking_code}`} key={d.id} className="block bg-white border border-slate-200 p-5 hover:border-[#002FA7] transition-colors" data-testid={`customer-order-${d.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono-tabular text-xs text-slate-500">{d.tracking_code}</div>
                  <div className="font-heading font-semibold mt-1">{d.drop_address}</div>
                  <div className="text-xs text-slate-500 mt-1">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                <StatusPill status={d.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
