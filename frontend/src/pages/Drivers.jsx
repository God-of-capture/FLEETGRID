import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { StatusPill } from "../components/StatusPill";
import { Plus, Star, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const empty = { full_name: "", phone: "", email: "", license_number: "", license_expiry: "", emergency_contact: "", assigned_vehicle_id: "" };

export default function Drivers() {
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [d, v] = await Promise.all([api.get("/drivers"), api.get("/vehicles")]);
    setItems(d.data); setVehicles(v.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.email) delete payload.email;
      if (!payload.assigned_vehicle_id) delete payload.assigned_vehicle_id;
      await api.post("/drivers", payload);
      toast.success("Driver added");
      setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this driver?")) return;
    await api.delete(`/drivers/${id}`);
    toast.success("Driver removed"); load();
  };

  return (
    <div className="space-y-6" data-testid="drivers-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-overline">Workforce</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Drivers</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="add-driver-btn"><Plus size={16} className="mr-2" /> Add driver</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New driver</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="label-overline">Full name</Label>
                  <Input required value={form.full_name} onChange={(e)=>setForm({...form, full_name:e.target.value})} className="mt-2" data-testid="driver-name-input" /></div>
                <div><Label className="label-overline">Phone</Label>
                  <Input required value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} className="mt-2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="label-overline">License #</Label>
                  <Input required value={form.license_number} onChange={(e)=>setForm({...form, license_number:e.target.value})} className="mt-2" /></div>
                <div><Label className="label-overline">License expiry</Label>
                  <Input type="date" value={form.license_expiry} onChange={(e)=>setForm({...form, license_expiry:e.target.value})} className="mt-2" /></div>
              </div>
              <div><Label className="label-overline">Email (optional)</Label>
                <Input type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} className="mt-2" /></div>
              <div><Label className="label-overline">Assigned vehicle</Label>
                <Select value={form.assigned_vehicle_id} onValueChange={(v)=>setForm({...form, assigned_vehicle_id:v})}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v=><SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent>
                </Select></div>
              <Button type="submit" className="btn-brand w-full" data-testid="driver-submit-btn">Create driver</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <div className="col-span-full p-12 text-center text-slate-500 border border-slate-200 bg-white">No drivers yet.</div>}
        {items.map((d) => {
          const v = vehicles.find(x => x.id === d.assigned_vehicle_id);
          return (
            <div key={d.id} className="bg-white border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={`driver-card-${d.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-heading font-semibold">
                    {d.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-heading font-semibold">{d.full_name}</div>
                    <div className="text-xs text-slate-500 font-mono-tabular">{d.phone}</div>
                  </div>
                </div>
                <StatusPill status={d.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div><div className="label-overline">License</div><div className="font-mono-tabular mt-1">{d.license_number}</div></div>
                <div><div className="label-overline">Rating</div><div className="mt-1 flex items-center gap-1"><Star size={12} weight="fill" color="#F59E0B" />{d.rating}</div></div>
                <div className="col-span-2"><div className="label-overline">Vehicle</div><div className="font-mono-tabular mt-1">{v?.registration_number || "—"}</div></div>
                <div className="col-span-2"><div className="label-overline">Deliveries</div><div className="font-mono-tabular mt-1">{d.deliveries_completed}</div></div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={()=>remove(d.id)} data-testid={`delete-driver-${d.id}`}>
                  <Trash size={14} className="mr-1" /> Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
