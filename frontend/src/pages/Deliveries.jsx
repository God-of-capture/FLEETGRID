import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { StatusPill } from "../components/StatusPill";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

const empty = {
  customer_id: "", pickup_address: "", drop_address: "",
  pickup_lat: 19.0760, pickup_lng: 72.8777, drop_lat: 19.2183, drop_lng: 72.9781,
  priority: "normal", package_description: "", weight_kg: 0, cod_amount: 0, instructions: "",
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
    try {
      const payload = {
        ...form,
        weight_kg: Number(form.weight_kg) || 0,
        cod_amount: Number(form.cod_amount) || 0,
        pickup_lat: Number(form.pickup_lat), pickup_lng: Number(form.pickup_lng),
        drop_lat: Number(form.drop_lat), drop_lng: Number(form.drop_lng),
      };
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
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create delivery</DialogTitle></DialogHeader>
                <form onSubmit={create} className="space-y-4">
                  <div><Label className="label-overline">Customer</Label>
                    <Select value={form.customer_id} onValueChange={(v)=>setForm({...form, customer_id:v})}>
                      <SelectTrigger className="mt-2" data-testid="delivery-customer-select"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>{customers.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="label-overline">Pickup address</Label>
                      <Input required value={form.pickup_address} onChange={(e)=>setForm({...form, pickup_address:e.target.value})} className="mt-2" data-testid="delivery-pickup-input" /></div>
                    <div><Label className="label-overline">Drop address</Label>
                      <Input required value={form.drop_address} onChange={(e)=>setForm({...form, drop_address:e.target.value})} className="mt-2" data-testid="delivery-drop-input" /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div><Label className="label-overline">Pickup lat</Label><Input value={form.pickup_lat} onChange={(e)=>setForm({...form, pickup_lat:e.target.value})} className="mt-2 font-mono-tabular" /></div>
                    <div><Label className="label-overline">Pickup lng</Label><Input value={form.pickup_lng} onChange={(e)=>setForm({...form, pickup_lng:e.target.value})} className="mt-2 font-mono-tabular" /></div>
                    <div><Label className="label-overline">Drop lat</Label><Input value={form.drop_lat} onChange={(e)=>setForm({...form, drop_lat:e.target.value})} className="mt-2 font-mono-tabular" /></div>
                    <div><Label className="label-overline">Drop lng</Label><Input value={form.drop_lng} onChange={(e)=>setForm({...form, drop_lng:e.target.value})} className="mt-2 font-mono-tabular" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="label-overline">Priority</Label>
                      <Select value={form.priority} onValueChange={(v)=>setForm({...form, priority:v})}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{["low","normal","high","urgent"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="label-overline">Weight (kg)</Label>
                      <Input type="number" value={form.weight_kg} onChange={(e)=>setForm({...form, weight_kg:e.target.value})} className="mt-2" /></div>
                    <div><Label className="label-overline">COD (₹)</Label>
                      <Input type="number" value={form.cod_amount} onChange={(e)=>setForm({...form, cod_amount:e.target.value})} className="mt-2" /></div>
                  </div>
                  <div><Label className="label-overline">Package description</Label>
                    <Input value={form.package_description} onChange={(e)=>setForm({...form, package_description:e.target.value})} className="mt-2" /></div>
                  <div><Label className="label-overline">Instructions</Label>
                    <Textarea value={form.instructions} onChange={(e)=>setForm({...form, instructions:e.target.value})} className="mt-2" /></div>
                  <Button type="submit" className="btn-brand w-full" data-testid="delivery-submit-btn">Create delivery</Button>
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
