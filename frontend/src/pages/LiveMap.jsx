import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { StatusPill } from "../components/StatusPill";

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="background:#002FA7;color:white;font-size:11px;font-weight:600;padding:2px 6px;border-radius:3px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap">DRV</div>`,
});

export default function LiveMap() {
  const [drivers, setDrivers] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetch = () => api.get("/drivers").then(r=>setDrivers(r.data));
    fetch();
    const i = setInterval(() => { fetch(); setTick(t=>t+1); }, 8000);
    return () => clearInterval(i);
  }, []);

  const withLoc = drivers.filter(d => d.current_lat && d.current_lng);
  const center = withLoc[0] ? [withLoc[0].current_lat, withLoc[0].current_lng] : [19.076, 72.877];

  return (
    <div className="space-y-6" data-testid="live-map">
      <div>
        <div className="label-overline">Real-time</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Live fleet map</h1>
        <p className="text-sm text-slate-500 mt-2 font-mono-tabular">{withLoc.length} drivers visible • auto-refresh every 8s</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 h-[560px] border border-slate-200 bg-slate-100">
          <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                       attribution="© OpenStreetMap, © CartoDB" />
            {withLoc.map((d) => (
              <Marker key={d.id} position={[d.current_lat, d.current_lng]} icon={driverIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{d.full_name}</div>
                    <div className="text-xs text-slate-500">{d.phone}</div>
                    <div className="mt-1">★ {d.rating} • {d.deliveries_completed} delivered</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="bg-white border border-slate-200 overflow-y-auto max-h-[560px]">
          <div className="px-5 py-4 border-b border-slate-200 sticky top-0 bg-white"><div className="label-overline">Drivers ({drivers.length})</div></div>
          <ul className="divide-y divide-slate-100">
            {drivers.map(d => (
              <li key={d.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.full_name}</div>
                    <div className="text-xs text-slate-500 font-mono-tabular truncate">{d.phone}</div>
                  </div>
                  <StatusPill status={d.status} />
                </div>
                <div className="mt-2 text-[11px] text-slate-500 font-mono-tabular">
                  {d.current_lat ? `${d.current_lat.toFixed(4)}, ${d.current_lng.toFixed(4)}` : "No location"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
