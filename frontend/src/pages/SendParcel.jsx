import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { toast } from "sonner";
import { ArrowLeft, Bicycle, Car, CheckCircle, Lightning } from "@phosphor-icons/react";

const vehicles = [
  { id: "two_wheeler", I: Bicycle, name: "Two-wheeler", limit: 5, eta: "20-35 min", price: 60, sub: "Best value" },
  { id: "four_wheeler", I: Car, name: "Four-wheeler", limit: 10, eta: "30-50 min", price: 160, sub: "Premium, climate-safe" },
];

export default function SendParcel() {
  const navigate = useNavigate();
  const [f, setF] = useState({
    pickup_address: "", pickup_lat: null, pickup_lng: null,
    drop_address: "", drop_lat: null, drop_lng: null,
    weight_kg: 1, priority: "normal", package_description: "",
    instructions: "", cod_amount: 0,
  });
  const [vehicle, setVehicle] = useState("two_wheeler");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.pickup_lat || !f.drop_lat) return toast.error("Pick valid addresses from suggestions");
    const w = Number(f.weight_kg) || 0;
    const v = vehicles.find(x => x.id === vehicle);
    if (w > v.limit) return toast.error(`${v.name} max ${v.limit} kg. Pick the other option.`);
    setBusy(true);
    try {
      const r = await api.post("/customer/send-parcel", {
        ...f, weight_kg: w, cod_amount: Number(f.cod_amount) || 0,
        package_description: `${vehicle}:${f.package_description || "Parcel"}`,
      });
      toast.success(`Booked ${r.data.tracking_code}`);
      navigate(`/track/${r.data.tracking_code}`);
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/portal" className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} /> Back</Link>
          <div className="font-heading font-bold text-sm">SEND PARCEL</div>
          <div className="w-12"></div>
        </div>
      </header>

      <form onSubmit={submit} className="max-w-3xl mx-auto p-5 space-y-5">
        <div>
          <div className="label-overline">On-demand delivery</div>
          <h1 className="font-heading text-3xl font-bold mt-1">Send a parcel</h1>
        </div>

        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div>
            <Label className="label-overline">Pickup location</Label>
            <div className="mt-2"><AddressAutocomplete
              value={f.pickup_address}
              onChange={(v)=>setF({...f, pickup_address:v, pickup_lat:null, pickup_lng:null})}
              onPick={(p)=>setF({...f, pickup_address:p.address, pickup_lat:p.lat, pickup_lng:p.lng})}
              testid="parcel-pickup" placeholder="Where should we pick up from?" /></div>
          </div>
          <div>
            <Label className="label-overline">Drop location</Label>
            <div className="mt-2"><AddressAutocomplete
              value={f.drop_address}
              onChange={(v)=>setF({...f, drop_address:v, drop_lat:null, drop_lng:null})}
              onPick={(p)=>setF({...f, drop_address:p.address, drop_lat:p.lat, drop_lng:p.lng})}
              testid="parcel-drop" placeholder="Where should it go?" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="label-overline">Weight (kg)</Label>
              <Input type="number" step="0.1" min="0.1" required value={f.weight_kg} onChange={(e)=>setF({...f, weight_kg:e.target.value})} className="mt-2" data-testid="parcel-weight" /></div>
            <div><Label className="label-overline">Package</Label>
              <Input value={f.package_description} onChange={(e)=>setF({...f, package_description:e.target.value})} placeholder="Documents, food, etc." className="mt-2" /></div>
          </div>
        </div>

        <div>
          <div className="label-overline mb-2">Choose your ride</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map(({ id, I, name, limit, eta, price, sub }) => {
              const disabled = Number(f.weight_kg) > limit;
              const active = vehicle === id;
              return (
                <button type="button" key={id} onClick={()=>!disabled && setVehicle(id)} disabled={disabled}
                  data-testid={`vehicle-${id}`}
                  className={`text-left bg-white border p-5 transition-all ${active ? "border-[#002FA7] ring-2 ring-[#002FA7]/20" : "border-slate-200"} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:border-[#002FA7]"}`}>
                  <div className="flex items-start justify-between">
                    <I size={32} weight="duotone" color={active ? "#002FA7" : "#0A0A0A"} />
                    {active && <CheckCircle size={18} weight="fill" color="#002FA7" />}
                  </div>
                  <div className="mt-3 font-heading font-semibold">{name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{sub} · up to {limit} kg</div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="font-heading text-xl font-bold font-mono-tabular">₹{price}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1"><Lightning size={12} weight="fill" />{eta}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5">
          <Label className="label-overline">Instructions (optional)</Label>
          <Textarea value={f.instructions} onChange={(e)=>setF({...f, instructions:e.target.value})} rows={2} className="mt-2" />
        </div>

        <Button type="submit" disabled={busy} className="btn-brand w-full h-12" data-testid="parcel-submit">
          {busy ? "Booking…" : "Confirm booking"}
        </Button>
      </form>
    </div>
  );
}
