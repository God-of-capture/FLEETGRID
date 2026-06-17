import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { StatusPill } from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Truck, SignOut, MapPin, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function DriverPortal() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [pod, setPod] = useState({ pod_signature: "", pod_notes: "", pod_photo_url: "" });

  const load = () => api.get("/deliveries").then(r=>setItems(r.data));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    const loc = await getLoc();
    await api.post(`/deliveries/${id}/status`, { status, ...loc });
    toast.success(`Marked ${status.replace("_"," ")}`); load();
  };

  const submitPod = async (e) => {
    e.preventDefault();
    const loc = await getLoc();
    await api.post(`/deliveries/${active.id}/pod`, { ...pod, ...loc });
    toast.success("Delivery completed");
    setActive(null); setPod({ pod_signature: "", pod_notes: "", pod_photo_url: "" }); load();
  };

  const getLoc = () => new Promise((res) => {
    if (!navigator.geolocation) return res({});
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}),
      { timeout: 4000 }
    );
  });

  const pushLoc = async () => {
    const loc = await getLoc();
    if (loc.lat) {
      // Find driver by user_id via list
      const drivers = await api.get("/drivers").then(r=>r.data).catch(()=>[]);
      const me = drivers.find(d => d.user_id === user.id);
      if (me) await api.post(`/drivers/${me.id}/location`, loc).catch(()=>{});
    }
  };
  useEffect(() => { pushLoc(); const i = setInterval(pushLoc, 30000); return () => clearInterval(i); /* eslint-disable-next-line */ }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#002FA7] flex items-center justify-center"><Truck size={14} weight="fill" color="white" /></div>
            <div className="font-heading font-bold text-sm">DRIVER</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} data-testid="driver-logout"><SignOut size={16} /></Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-5 space-y-5">
        <div>
          <div className="label-overline">Hi {user?.full_name?.split(" ")[0]}</div>
          <h1 className="font-heading text-2xl font-bold mt-1">Today's deliveries</h1>
        </div>

        {items.length === 0 && <div className="text-sm text-slate-500 bg-white border border-slate-200 p-8 text-center">No deliveries assigned.</div>}

        {items.map((d) => (
          <div key={d.id} className="bg-white border border-slate-200 p-5" data-testid={`driver-delivery-${d.id}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono-tabular text-xs text-slate-500">{d.tracking_code}</div>
                <div className="font-heading text-lg font-semibold mt-1">{d.customer_name}</div>
              </div>
              <StatusPill status={d.status} />
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div className="flex items-start gap-2"><MapPin size={14} className="text-[#002FA7] mt-0.5" />{d.pickup_address}</div>
              <div className="flex items-start gap-2"><MapPin size={14} className="text-emerald-600 mt-0.5" />{d.drop_address}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.status === "assigned" && <Button size="sm" className="btn-brand" onClick={()=>setStatus(d.id, "picked_up")} data-testid={`pickup-${d.id}`}>Mark picked up</Button>}
              {d.status === "picked_up" && <Button size="sm" className="btn-brand" onClick={()=>setStatus(d.id, "in_transit")}>Start trip</Button>}
              {d.status === "in_transit" && <Button size="sm" className="btn-brand" onClick={()=>setStatus(d.id, "out_for_delivery")}>Out for delivery</Button>}
              {["out_for_delivery","in_transit","picked_up"].includes(d.status) && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={()=>setActive(d)} data-testid={`pod-${d.id}`}>
                      <CheckCircle size={14} className="mr-1" /> Complete with POD
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Proof of delivery</DialogTitle></DialogHeader>
                    <form onSubmit={submitPod} className="space-y-3">
                      <Input placeholder="Recipient name (signature)" value={pod.pod_signature} onChange={(e)=>setPod({...pod, pod_signature:e.target.value})} required data-testid="pod-signature" />
                      <Input placeholder="Photo URL (optional)" value={pod.pod_photo_url} onChange={(e)=>setPod({...pod, pod_photo_url:e.target.value})} />
                      <Textarea placeholder="Notes" value={pod.pod_notes} onChange={(e)=>setPod({...pod, pod_notes:e.target.value})} />
                      <Button type="submit" className="btn-brand w-full" data-testid="pod-submit">Submit POD</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              {d.status !== "delivered" && d.status !== "failed" && (
                <Button size="sm" variant="ghost" onClick={()=>setStatus(d.id, "failed")} className="text-red-600">Mark failed</Button>
              )}
              <Link to={`/track/${d.tracking_code}`} target="_blank" className="text-xs underline text-slate-500 self-center ml-auto">View public link</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
