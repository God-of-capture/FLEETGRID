import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { StatusPill } from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Truck, SignOut, MapPin, Clock, CurrencyInr } from "@phosphor-icons/react";
import DriverDeliveries from "./DriverDeliveries";

function timeLeft(expiresAt) {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return "Expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DriverJobs() {
  const { user, logout } = useAuth();
  const [offers, setOffers] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [sort, setSort] = useState("distance");
  const [message, setMessage] = useState(null);

  const load = () => {
    api.get("/driver/jobs", { params: { sort } }).then((r) => {
      setOffers(r.data.offers || []);
      setAssigned(r.data.assigned || []);
      setMessage(r.data.message);
    });
  };
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [sort]);

  const accept = async (id) => {
    try {
      await api.post(`/offers/${id}/accept`);
      toast.success("Offer accepted!");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not accept offer");
    }
  };

  const decline = async (id) => {
    await api.post(`/offers/${id}/decline`);
    toast.info("Offer declined");
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#002FA7] flex items-center justify-center"><Truck size={14} weight="fill" color="white" /></div>
            <div className="font-heading font-bold text-sm">DRIVER</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><SignOut size={16} /></Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-5">
        <div className="label-overline">Hi {user?.full_name?.split(" ")[0]}</div>
        <h1 className="font-heading text-2xl font-bold mt-1">Delivery hub</h1>

        {message && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-sm text-amber-900">
            {message}. <Link to="/partner/onboarding" className="underline font-medium">Complete onboarding</Link>
          </div>
        )}

        <Tabs defaultValue="jobs" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="jobs" className="flex-1">Available jobs ({offers.length})</TabsTrigger>
            <TabsTrigger value="active" className="flex-1">My deliveries ({assigned.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Nearest first</SelectItem>
                  <SelectItem value="payout">Highest payout</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="expires">Expiring soon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {offers.length === 0 && (
              <div className="text-sm text-slate-500 bg-white border border-slate-200 p-8 text-center">
                No offers right now. Check back soon.
              </div>
            )}

            {offers.map((o) => (
              <div key={o.id} className="bg-white border border-slate-200 p-5" data-testid={`offer-${o.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono-tabular text-xs text-slate-500">{o.delivery?.tracking_code}</div>
                    <div className="font-heading font-semibold mt-1 capitalize">{o.delivery?.priority} priority</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <CurrencyInr size={14} />{o.payout_estimate?.toFixed(0)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <Clock size={12} />{timeLeft(o.expires_at)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex gap-2"><MapPin size={14} className="text-[#002FA7] shrink-0" />{o.delivery?.pickup_address}</div>
                  <div className="flex gap-2"><MapPin size={14} className="text-emerald-600 shrink-0" />{o.delivery?.drop_address}</div>
                  <div className="text-slate-400">{o.estimated_distance_km?.toFixed(1)} km · {o.delivery?.package_description || "Parcel"}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="btn-brand flex-1" onClick={() => accept(o.id)}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => decline(o.id)}>Decline</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <DriverDeliveries assigned={assigned} onRefresh={load} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
