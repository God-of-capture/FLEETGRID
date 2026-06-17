import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Truck, Package } from "@phosphor-icons/react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";

const dot = (color) => L.divIcon({
  className: "",
  html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 1px ${color}"></div>`,
});

export default function PublicTracking() {
  const { code: routeCode } = useParams();
  const [code, setCode] = useState(routeCode || "");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const fetchIt = async (c) => {
    setErr("");
    try { const r = await api.get(`/track/${c}`); setData(r.data); }
    catch (e) { setErr(e?.response?.data?.detail || "Not found"); setData(null); }
  };

  useEffect(() => { if (routeCode) fetchIt(routeCode); }, [routeCode]);

  return (
    <div className="min-h-screen bg-white">
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2"><div className="w-7 h-7 bg-[#002FA7] flex items-center justify-center"><Truck size={16} weight="fill" color="white" /></div><div className="font-heading font-bold text-base">FLEETGRID</div></a>
          <div className="label-overline">Public tracking</div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="label-overline">Shipment status</div>
        <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight mt-3">Where's my parcel?</h1>
        <form onSubmit={(e)=>{e.preventDefault(); fetchIt(code);}} className="mt-8 flex gap-2 max-w-xl">
          <Input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="TRK-XXXXXXXX" className="h-12 font-mono-tabular border-[#0A0A0A]" data-testid="public-track-input" />
          <Button type="submit" className="btn-brand h-12" data-testid="public-track-submit">Track</Button>
        </form>

        {err && <div className="mt-8 p-6 bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

        {data && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="font-mono-tabular text-sm text-slate-500">{data.tracking_code}</div>
                <div className="mt-2 flex items-center justify-between">
                  <h2 className="font-heading text-2xl font-semibold">{data.customer_name}</h2>
                  <StatusPill status={data.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div><div className="label-overline">Pickup</div><div className="mt-1">{data.pickup_address}</div></div>
                  <div><div className="label-overline">Drop</div><div className="mt-1">{data.drop_address}</div></div>
                </div>
              </div>
              <div className="h-80">
                <MapContainer center={[data.drop_lat || 19.076, data.drop_lng || 72.877]} zoom={11} style={{height:"100%", width:"100%"}}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap, © CartoDB" />
                  {data.pickup_lat && <Marker position={[data.pickup_lat, data.pickup_lng]} icon={dot("#002FA7")} />}
                  {data.drop_lat && <Marker position={[data.drop_lat, data.drop_lng]} icon={dot("#10B981")} />}
                  {data.driver?.current_lat && <Marker position={[data.driver.current_lat, data.driver.current_lng]} icon={dot("#0A0A0A")} />}
                  {data.pickup_lat && data.drop_lat && <Polyline positions={[[data.pickup_lat, data.pickup_lng],[data.drop_lat, data.drop_lng]]} pathOptions={{color:"#0A0A0A", weight:3, dashArray:"6 6"}} />}
                </MapContainer>
              </div>
              <div className="p-6">
                <div className="label-overline mb-4">Timeline</div>
                <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
                  {(data.timeline || []).map((e, i) => (
                    <li key={i} className="ml-5">
                      <span className="absolute -left-2 w-3 h-3 bg-[#002FA7] rounded-full"></span>
                      <div className="text-sm font-medium capitalize">{e.status.replace("_"," ")}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular">{new Date(e.at).toLocaleString()}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="space-y-4">
              {data.driver && (
                <div className="bg-white border border-slate-200 p-6">
                  <div className="label-overline">Your driver</div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-semibold">{data.driver.full_name?.[0]}</div>
                    <div>
                      <div className="font-medium">{data.driver.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular">{data.driver.phone}</div>
                      <div className="text-xs mt-1">★ {data.driver.rating || "—"}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-[#0A0A0A] text-white p-6">
                <div className="label-overline" style={{color:"#94A3B8"}}>Need help?</div>
                <div className="mt-2 text-sm">Contact your sender or reach FleetGrid support.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
