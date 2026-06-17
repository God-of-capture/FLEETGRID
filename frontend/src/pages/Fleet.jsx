import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { StatusPill } from "../components/StatusPill";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const empty = { registration_number: "", vehicle_type: "van", capacity_kg: 0, fuel_type: "diesel", insurance_expiry: "", notes: "" };

export default function Fleet() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/vehicles").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", { ...form, capacity_kg: Number(form.capacity_kg) || 0 });
      toast.success("Vehicle added");
      setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    await api.delete(`/vehicles/${id}`);
    toast.success("Vehicle removed"); load();
  };

  return (
    <div className="space-y-6" data-testid="fleet-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-overline">Fleet</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Vehicles</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="add-vehicle-btn"><Plus size={16} className="mr-2" /> Add vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New vehicle</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div><Label className="label-overline">Registration number</Label>
                <Input required value={form.registration_number} onChange={(e)=>setForm({...form, registration_number:e.target.value})} className="mt-2" data-testid="vehicle-reg-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="label-overline">Type</Label>
                  <Select value={form.vehicle_type} onValueChange={(v)=>setForm({...form, vehicle_type:v})}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{["bike","car","van","truck"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="label-overline">Fuel</Label>
                  <Select value={form.fuel_type} onValueChange={(v)=>setForm({...form, fuel_type:v})}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{["petrol","diesel","ev","cng"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div><Label className="label-overline">Capacity (kg)</Label>
                <Input type="number" value={form.capacity_kg} onChange={(e)=>setForm({...form, capacity_kg:e.target.value})} className="mt-2" /></div>
              <Button type="submit" className="btn-brand w-full" data-testid="vehicle-submit-btn">Create vehicle</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="label-overline text-left">
              <th className="px-6 py-3">Reg. number</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Fuel</th>
              <th className="px-6 py-3 text-right">Capacity</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No vehicles yet.</td></tr>}
            {items.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`vehicle-row-${v.id}`}>
                <td className="px-6 py-4 font-mono-tabular">{v.registration_number}</td>
                <td className="px-6 py-4 capitalize">{v.vehicle_type}</td>
                <td className="px-6 py-4 uppercase text-xs">{v.fuel_type}</td>
                <td className="px-6 py-4 text-right font-mono-tabular">{v.capacity_kg} kg</td>
                <td className="px-6 py-4"><StatusPill status={v.status} /></td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(v.id)} data-testid={`delete-vehicle-${v.id}`}>
                    <Trash size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
