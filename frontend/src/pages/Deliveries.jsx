import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { StatusPill } from "../components/StatusPill";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { Plus, Package, UserCircle, Car } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

const empty = {
  service_type: "shipping",
  customer_mode: "existing", // existing | new
  customer_id: "",
  customer_name: "", customer_phone: "", customer_email: "", save_customer: true,
  pickup_address: "", drop_address: "",
  pickup_lat: null, pickup_lng: null, drop_lat: null, drop_lng: null,
  priority: "normal", package_description: "", weight_kg: 0, cod_amount: 0, instructions: "",
  journey_date: "", journey_time: "", passengers: 1, round_trip: false, return_date: "",
};

export default function Deliveries() {
  const { hasRole } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState("all");
  const canCreate = hasRole("org_owner", "ops_manager", "dispatcher");

  const load = async () => {
    const params = status !== "all" ? { params: { status } } : {};
    const [d, c] = await Promise.all([api.get("/deliveries", params), api.get("/customers")]);
    setItems(d.data); setCustomers(c.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.pickup_lat || !form.drop_lat) {
      return toast.error("Please pick valid addresses from the suggestions");
    }
    try {
      const payload = {
        service_type: form.service_type,
        pickup_address: form.pickup_address,
        pickup_lat: form.pickup_lat, pickup_lng: form.pickup_lng,
        drop_address: form.drop_address,
        drop_lat: form.drop_lat, drop_lng: form.drop_lng,
        priority: form.priority,
        instructions: form.instructions,
      };
      if (form.customer_mode === "existing") {
        if (!form.customer_id) return toast.error("Select a customer");
        payload.customer_id = form.customer_id;
      } else {
        if (!form.customer_name || !form.customer_phone) return toast.error("Customer name & phone required");
        payload.customer_name = form.customer_name;
        payload.customer_phone = form.customer_phone;
        payload.customer_email = form.customer_email || undefined;
        payload.save_customer = form.save_customer;
      }
      if (form.service_type === "shipping") {
        payload.package_description = form.package_description;
        payload.weight_kg = Number(form.weight_kg) || 0;
        payload.cod_amount = Number(form.cod_amount) || 0;
      } else {
        payload.journey_date = form.journey_date;
        payload.journey_time = form.journey_time;
        payload.passengers = Number(form.passengers) || 1;
        payload.round_trip = form.round_trip;
        payload.return_date = form.return_date || undefined;
      }
      const r = await api.post("/deliveries", payload);
      toast.success(`Created ${r.data.tracking_code}`); setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6" data-testid="deliveries-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-overline">Operations</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Deliveries</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" data-testid="status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all","pending","assigned","picked_up","in_transit","out_for_delivery","delivered","failed","cancelled"]
                .map(s=> <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
            </SelectContent>
          </Select>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="btn-brand" data-testid="add-delivery-btn"><Plus size={16} className="mr-2" /> New delivery</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New booking</DialogTitle></DialogHeader>
                <form onSubmit={create} className="space-y-4">
                  {/* Service type */}
                  <div>
                    <Label className="label-overline">Service type</Label>
                    <Tabs value={form.service_type} onValueChange={(v)=>setForm({...form, service_type:v})} className="mt-2">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="shipping" data-testid="service-shipping"><Package size={14} className="mr-2" /> Shipping & Courier</TabsTrigger>
                        <TabsTrigger value="travel" data-testid="service-travel"><Car size={14} className="mr-2" /> Travel</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Customer */}
                  <div>
                    <Label className="label-overline">Customer</Label>
                    <Tabs value={form.customer_mode} onValueChange={(v)=>setForm({...form, customer_mode:v})} className="mt-2">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="existing" data-testid="customer-mode-existing"><UserCircle size={14} className="mr-2" /> Saved customer</TabsTrigger>
                        <TabsTrigger value="new" data-testid="customer-mode-new"><Plus size={14} className="mr-2" /> New customer</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {form.customer_mode === "existing" ? (
                      <Select value={form.customer_id} onValueChange={(v)=>setForm({...form, customer_id:v})}>
                        <SelectTrigger className="mt-2" data-testid="delivery-customer-select"><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>{customers.map(c=><SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Input placeholder="Customer name *" value={form.customer_name} onChange={(e)=>setForm({...form, customer_name:e.target.value})} data-testid="inline-customer-name" />
                        <Input placeholder="Phone *" value={form.customer_phone} onChange={(e)=>setForm({...form, customer_phone:e.target.value})} data-testid="inline-customer-phone" />
                        <Input placeholder="Email (optional)" type="email" value={form.customer_email} onChange={(e)=>setForm({...form, customer_email:e.target.value})} className="col-span-2" />
                        <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={form.save_customer} onChange={(e)=>setForm({...form, save_customer:e.target.checked})} data-testid="save-customer-toggle" />
                          Save to customer directory for future bookings
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="grid grid-cols-1 gap-3">
                    <div><Label className="label-overline">Pickup address</Label>
                      <div className="mt-2">
                        <AddressAutocomplete
                          value={form.pickup_address}
                          onChange={(v)=>setForm({...form, pickup_address:v, pickup_lat:null, pickup_lng:null})}
                          onPick={(p)=>setForm({...form, pickup_address:p.address, pickup_lat:p.lat, pickup_lng:p.lng})}
                          placeholder="Search pickup location…" testid="pickup-autocomplete"
                        /></div></div>
                    <div><Label className="label-overline">Drop address</Label>
                      <div className="mt-2">
                        <AddressAutocomplete
                          value={form.drop_address}
                          onChange={(v)=>setForm({...form, drop_address:v, drop_lat:null, drop_lng:null})}
                          onPick={(p)=>setForm({...form, drop_address:p.address, drop_lat:p.lat, drop_lng:p.lng})}
                          placeholder="Search drop location…" testid="drop-autocomplete"
                        /></div></div>
                  </div>

                  {/* Priority always */}
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="label-overline">Priority</Label>
                      <Select value={form.priority} onValueChange={(v)=>setForm({...form, priority:v})}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{["low","normal","high","urgent","express","same_day"].map(x=><SelectItem key={x} value={x}>{x.replace("_"," ")}</SelectItem>)}</SelectContent>
                      </Select></div>
                    {form.service_type === "shipping" ? (
                      <>
                        <div><Label className="label-overline">Weight (kg)</Label>
                          <Input type="number" value={form.weight_kg} onChange={(e)=>setForm({...form, weight_kg:e.target.value})} className="mt-2" /></div>
                        <div><Label className="label-overline">COD (₹)</Label>
                          <Input type="number" value={form.cod_amount} onChange={(e)=>setForm({...form, cod_amount:e.target.value})} className="mt-2" /></div>
                      </>
                    ) : (
                      <>
                        <div><Label className="label-overline">Passengers</Label>
                          <Input type="number" min="1" value={form.passengers} onChange={(e)=>setForm({...form, passengers:e.target.value})} className="mt-2" /></div>
                        <div className="flex items-end"><label className="flex items-center gap-2 text-sm pb-2">
                          <input type="checkbox" checked={form.round_trip} onChange={(e)=>setForm({...form, round_trip:e.target.checked})} data-testid="round-trip-toggle" />
                          Round trip</label></div>
                      </>
                    )}
                  </div>

                  {form.service_type === "shipping" ? (
                    <div><Label className="label-overline">Package description</Label>
                      <Input value={form.package_description} onChange={(e)=>setForm({...form, package_description:e.target.value})} className="mt-2" /></div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="label-overline">Journey date</Label>
                        <Input type="date" value={form.journey_date} onChange={(e)=>setForm({...form, journey_date:e.target.value})} className="mt-2" data-testid="journey-date" /></div>
                      <div><Label className="label-overline">Journey time</Label>
                        <Input type="time" value={form.journey_time} onChange={(e)=>setForm({...form, journey_time:e.target.value})} className="mt-2" /></div>
                      {form.round_trip && <div className="col-span-2"><Label className="label-overline">Return date</Label>
                        <Input type="date" value={form.return_date} onChange={(e)=>setForm({...form, return_date:e.target.value})} className="mt-2" /></div>}
                    </div>
                  )}

                  <div><Label className="label-overline">Instructions</Label>
                    <Textarea value={form.instructions} onChange={(e)=>setForm({...form, instructions:e.target.value})} className="mt-2" rows={2} /></div>
                  <Button type="submit" className="btn-brand w-full" data-testid="delivery-submit-btn">Create {form.service_type === "travel" ? "trip" : "delivery"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="label-overline text-left">
              <th className="px-6 py-3">Tracking</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Drop</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">COD</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No deliveries.</td></tr>}
            {items.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={()=>nav(`/app/deliveries/${d.id}`)} data-testid={`delivery-row-${d.id}`}>
                <td className="px-6 py-4 font-mono-tabular text-[#002FA7]">{d.tracking_code}</td>
                <td className="px-6 py-4">{d.customer_name}</td>
                <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{d.drop_address}</td>
                <td className="px-6 py-4 uppercase text-xs tracking-wider">{d.priority}</td>
                <td className="px-6 py-4"><StatusPill status={d.status} /></td>
                <td className="px-6 py-4 text-right font-mono-tabular">₹{Number(d.cod_amount||0).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
