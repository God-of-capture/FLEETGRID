import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const empty = { name: "", email: "", phone: "", address: "", company: "", notes: "" };

export default function Customers() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const load = () => api.get("/customers").then(r=>setItems(r.data));
  useEffect(()=>{ load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const p = {...form}; if (!p.email) delete p.email;
      await api.post("/customers", p);
      toast.success("Customer added"); setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete customer?")) return;
    await api.delete(`/customers/${id}`); toast.success("Customer removed"); load();
  };

  const filtered = items.filter(c => !q || (c.name+c.phone+(c.email||"")+(c.company||"")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="customers-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-overline">Customers</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Customer book</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="add-customer-btn"><Plus size={16} className="mr-2" /> Add customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div><Label className="label-overline">Name</Label>
                <Input required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} className="mt-2" data-testid="customer-name-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="label-overline">Phone</Label>
                  <Input required value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} className="mt-2" /></div>
                <div><Label className="label-overline">Email</Label>
                  <Input type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} className="mt-2" /></div>
              </div>
              <div><Label className="label-overline">Company</Label>
                <Input value={form.company} onChange={(e)=>setForm({...form, company:e.target.value})} className="mt-2" /></div>
              <div><Label className="label-overline">Address</Label>
                <Input value={form.address} onChange={(e)=>setForm({...form, address:e.target.value})} className="mt-2" /></div>
              <Button type="submit" className="btn-brand w-full" data-testid="customer-submit-btn">Create customer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search customers…" className="max-w-md" data-testid="customer-search" />

      <div className="bg-white border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="label-overline text-left">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Company</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No customers.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`customer-row-${c.id}`}>
                <td className="px-6 py-4 font-medium">{c.name}</td>
                <td className="px-6 py-4 text-slate-600">{c.company || "—"}</td>
                <td className="px-6 py-4 font-mono-tabular">{c.phone}</td>
                <td className="px-6 py-4">{c.email || "—"}</td>
                <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{c.address || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)} data-testid={`delete-customer-${c.id}`}><Trash size={16} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
