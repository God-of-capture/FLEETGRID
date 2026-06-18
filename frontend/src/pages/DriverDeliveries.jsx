import React, { useState } from "react";
import { api } from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import FileUpload from "../components/FileUpload";
import { toast } from "sonner";
import { MapPin, CheckCircle, Package } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

function PickupDialog({ delivery, onDone, uploadMedia, getLoc }) {
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const confirm = async () => {
    const loc = await getLoc();
    await api.post(`/deliveries/${delivery.id}/pickup-confirm`, {
      pickup_photo_url: photoUrl || undefined, pickup_notes: notes, ...loc,
    });
    toast.success("Pickup confirmed");
    onDone?.();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="btn-brand"><Package size={14} className="mr-1" /> Confirm pickup</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirm pickup</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <FileUpload accept="image/*" label="Pickup photo"
            onUpload={async (f) => { const url = await uploadMedia(delivery.id, "pickup", f); setPhotoUrl(url); return url; }} />
          <Textarea placeholder="Pickup notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="btn-brand w-full" onClick={confirm}>Confirm pickup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DriverDeliveries({ assigned, onRefresh }) {
  const [active, setActive] = useState(null);
  const [pod, setPod] = useState({ pod_signature: "", pod_notes: "", pod_qr_confirmed: false });
  const items = assigned || [];

  const getLoc = () => new Promise((res) => {
    if (!navigator.geolocation) return res({});
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res({}), { timeout: 4000 },
    );
  });

  const setStatus = async (id, status) => {
    const loc = await getLoc();
    await api.post(`/deliveries/${id}/status`, { status, ...loc });
    toast.success(`Marked ${status.replace("_", " ")}`);
    onRefresh?.();
  };

  const uploadMedia = async (deliveryId, purpose, file) => {
    const fd = new FormData();
    fd.append("purpose", purpose);
    fd.append("file", file);
    const res = await api.post(`/deliveries/${deliveryId}/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  };

  const submitPod = async (e) => {
    e.preventDefault();
    const loc = await getLoc();
    await api.post(`/deliveries/${active.id}/pod/v2`, { ...pod, ...loc });
    toast.success("Delivery completed");
    setActive(null);
    setPod({ pod_signature: "", pod_notes: "", pod_qr_confirmed: false });
    onRefresh?.();
  };

  if (items.length === 0) {
    return <div className="text-sm text-slate-500 bg-white border border-slate-200 p-8 text-center">No active deliveries.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((d) => (
        <div key={d.id} className="bg-white border border-slate-200 p-5">
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
            {d.status === "assigned" && !d.pickup_confirmed_at && (
              <PickupDialog delivery={d} onDone={onRefresh} uploadMedia={uploadMedia} getLoc={getLoc} />
            )}
            {d.status === "assigned" && d.pickup_confirmed_at && (
              <Button size="sm" className="btn-brand" onClick={() => setStatus(d.id, "in_transit")}>Start trip</Button>
            )}
            {d.status === "picked_up" && <Button size="sm" className="btn-brand" onClick={() => setStatus(d.id, "in_transit")}>Start trip</Button>}
            {d.status === "in_transit" && <Button size="sm" className="btn-brand" onClick={() => setStatus(d.id, "out_for_delivery")}>Out for delivery</Button>}
            {["out_for_delivery", "in_transit", "picked_up", "assigned"].includes(d.status) && d.status !== "delivered" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => setActive(d)}>
                    <CheckCircle size={14} className="mr-1" /> Complete POD
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Proof of delivery</DialogTitle></DialogHeader>
                  <form onSubmit={submitPod} className="space-y-3">
                    <FileUpload accept="image/*" onUpload={(f) => uploadMedia(active?.id || d.id, "pod", f)} />
                    <Input placeholder="Recipient name" value={pod.pod_signature} onChange={(e) => setPod({ ...pod, pod_signature: e.target.value })} required />
                    <Textarea placeholder="Notes" value={pod.pod_notes} onChange={(e) => setPod({ ...pod, pod_notes: e.target.value })} />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={pod.pod_qr_confirmed}
                        onChange={(e) => setPod({ ...pod, pod_qr_confirmed: e.target.checked })} />
                      QR code confirmed
                    </label>
                    <Button type="submit" className="btn-brand w-full">Submit POD</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <Link to={`/track/${d.tracking_code}`} target="_blank" className="text-xs underline text-slate-500 self-center ml-auto">Track</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
