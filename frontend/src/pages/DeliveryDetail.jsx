import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { StatusPill } from "../components/StatusPill";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Package } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";

const icon = (color) => L.divIcon({
  className: "",
  html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 1px ${color}"></div>`,
});

export default function DeliveryDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [d, setD] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [driverId, setDriverId] = useState("");

  const load = () => api.get(`/deliveries/${id}`).then((r) => setD(r.data));
  useEffect(() => { load(); api.get("/drivers").then(r=>setDrivers(r.data)).catch(()=>{}); /* eslint-disable-next-line */ }, [id]);

  if (!d) return <div className="p-12 text-center text-slate-500">Loading…</div>;

  const assign = async () => {
    if (!driverId) return toast.error("Pick a driver");
    await api.post(`/deliveries/${id}/assign`, { driver_id: driverId });
    toast.success("Driver assigned"); load();
  };

  const setStatus = async (s) => {
    await api.post(`/deliveries/${id}/status`, { status: s });
    toast.success("Status updated"); load();
  };

  const trackingUrl = `${window.location.origin}/track/${d.tracking_code}`;
  const center = d.drop_lat && d.drop_lng ? [d.drop_lat, d.drop_lng] : [19.076, 72.877];
  const route = [];
  if (d.pickup_lat) route.push([d.pickup_lat, d.pickup_lng]);
  if (d.drop_lat) route.push([d.drop_lat, d.drop_lng]);

  return (
    <div className="space-y-6" data-testid="delivery-detail">
      <Link to="/app/deliveries" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#002FA7]"><ArrowLeft size={16} /> Back to deliveries</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <div className="label-overline">Tracking</div>
              <h1 className="font-heading text-3xl font-bold tracking-tight mt-1 font-mono-tabular">{d.tracking_code}</h1>
              <div className="mt-2"><StatusPill status={d.status} /></div>
            </div>
            <div className="text-right">
              <div className="label-overline">Priority</div>
              <div className="font-heading text-lg uppercase mt-1">{d.priority}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-200 border-b border-slate-200">
            <div className="bg-white p-6">
              <div className="label-overline">Pickup</div>
              <div className="flex items-start gap-2 mt-2"><MapPin size={16} className="text-[#002FA7] mt-0.5" />
                <div className="text-sm">{d.pickup_address}</div></div>
            </div>
            <div className="bg-white p-6">
              <div className="label-overline">Drop</div>
              <div className="flex items-start gap-2 mt-2"><MapPin size={16} className="text-emerald-600 mt-0.5" />
                <div className="text-sm">{d.drop_address}</div></div>
            </div>
          </div>

          <div className="h-72 bg-slate-100">
            <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap, © CartoDB" />
              {d.pickup_lat && <Marker position={[d.pickup_lat, d.pickup_lng]} icon={icon("#002FA7")} />}
              {d.drop_lat && <Marker position={[d.drop_lat, d.drop_lng]} icon={icon("#10B981")} />}
              {route.length === 2 && <Polyline positions={route} pathOptions={{ color: "#0A0A0A", weight: 3, dashArray: "6 6" }} />}
            </MapContainer>
          </div>

          <div className="p-6">
            <div className="label-overline mb-4">Timeline</div>
            <ol className="relative border-l-2 border-slate-200 ml-2 space-y-5">
              {(d.timeline || []).map((e, i) => (
                <li key={i} className="ml-5">
                  <span className="absolute -left-2 w-3 h-3 bg-[#002FA7] rounded-full"></span>
                  <div className="text-sm font-medium capitalize">{e.status.replace("_"," ")}</div>
                  <div className="text-xs text-slate-500 font-mono-tabular">{new Date(e.at).toLocaleString()}</div>
                  {e.note && <div className="text-xs text-slate-600 mt-1">{e.note}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6">
            <div className="label-overline">Customer</div>
            <div className="font-heading font-semibold text-lg mt-1">{d.customer_name}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><div className="label-overline">Package</div><div className="mt-1">{d.package_description || "—"}</div></div>
              <div><div className="label-overline">Weight</div><div className="font-mono-tabular mt-1">{d.weight_kg} kg</div></div>
              <div><div className="label-overline">COD</div><div className="font-mono-tabular mt-1">₹{Number(d.cod_amount||0).toLocaleString("en-IN")}</div></div>
              <div><div className="label-overline">Created</div><div className="font-mono-tabular mt-1">{new Date(d.created_at).toLocaleDateString()}</div></div>
            </div>
          </div>

          {hasRole("org_owner","ops_manager","dispatcher") && (
            <div className="bg-white border border-slate-200 p-6">
              <div className="label-overline">Operations</div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs mb-2 text-slate-600">Assign driver</div>
                  <div className="flex gap-2">
                    <Select value={driverId} onValueChange={setDriverId}>
                      <SelectTrigger data-testid="assign-driver-select"><SelectValue placeholder="Pick driver" /></SelectTrigger>
                      <SelectContent>{drivers.map(x=><SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={assign} className="btn-brand" data-testid="assign-btn">Assign</Button>
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-2 text-slate-600">Quick status</div>
                  <div className="grid grid-cols-2 gap-2">
                    {["picked_up","in_transit","out_for_delivery","delivered","failed","cancelled"].map(s => (
                      <Button key={s} variant="outline" size="sm" onClick={()=>setStatus(s)}
                              className="text-xs capitalize" data-testid={`set-status-${s}`}>{s.replace("_"," ")}</Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 p-6">
            <div className="label-overline">Proof of delivery QR</div>
            <div className="mt-4 flex items-center justify-center bg-white p-4 border border-slate-100">
              <QRCodeSVG value={trackingUrl} size={160} fgColor="#0A0A0A" />
            </div>
            <div className="mt-3 text-[11px] text-slate-500 font-mono-tabular break-all">{trackingUrl}</div>
          </div>

          {d.pod_photo_url || d.pod_signature ? (
            <div className="bg-white border border-slate-200 p-6">
              <div className="label-overline">Proof of delivery</div>
              {d.pod_photo_url && <img src={d.pod_photo_url} alt="POD" className="mt-3 w-full border" />}
              {d.pod_signature && <div className="mt-3 text-xs"><span className="text-slate-500">Signed by:</span> {d.pod_signature}</div>}
              {d.pod_notes && <div className="mt-2 text-sm">{d.pod_notes}</div>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
