import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Plus, Trash, CheckCircle } from "@phosphor-icons/react";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Settings() {
  const { user, organization } = useAuth();
  const [users, setUsers] = useState([]);
  const [orgForm, setOrgForm] = useState({ name: "", address: "", tax_id: "" });
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", full_name: "", password: "", roles: ["ops_manager"], phone: "" });
  const [plans, setPlans] = useState({});
  const [history, setHistory] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(organization?.plan || "trial");

  useEffect(() => {
    api.get("/users").then(r => setUsers(r.data)).catch(()=>{});
    api.get("/billing/plans").then(r => setPlans(r.data.plans)).catch(()=>{});
    api.get("/billing/history").then(r => setHistory(r.data)).catch(()=>{});
    setOrgForm({
      name: organization?.name || "",
      address: organization?.address || "",
      tax_id: organization?.tax_id || "",
    });
    setCurrentPlan(organization?.plan || "trial");
  }, [organization]);

  const upgrade = async (planKey) => {
    const ok = await loadRazorpay();
    if (!ok) return toast.error("Razorpay SDK failed to load");
    try {
      const { data } = await api.post("/billing/create-order", { plan: planKey });
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "FleetGrid",
        description: `${data.plan_name} subscription`,
        order_id: data.order_id,
        prefill: { name: user.full_name, email: user.email },
        theme: { color: "#002FA7" },
        handler: async (res) => {
          try {
            await api.post("/billing/verify", { ...res, plan: planKey });
            toast.success(`Upgraded to ${data.plan_name}`);
            setCurrentPlan(planKey);
            api.get("/billing/history").then(r => setHistory(r.data));
          } catch { toast.error("Payment verification failed"); }
        },
        modal: { ondismiss: () => toast("Checkout cancelled") },
      });
      rzp.open();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
    }
  };

  const saveOrg = async (e) => {
    e.preventDefault();
    await api.patch("/organization", orgForm);
    toast.success("Organization saved");
  };

  const inviteUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/invite", invite);
      toast.success("User invited"); setOpen(false);
      setInvite({ email: "", full_name: "", password: "", roles: ["ops_manager"], phone: "" });
      api.get("/users").then(r => setUsers(r.data));
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const removeUser = async (id) => {
    if (!window.confirm("Delete user?")) return;
    await api.delete(`/users/${id}`);
    api.get("/users").then(r => setUsers(r.data));
    toast.success("User removed");
  };

  return (
    <div className="space-y-8" data-testid="settings-page">
      <div>
        <div className="label-overline">Workspace</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-2">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-6">
          <h3 className="font-heading text-lg font-semibold">Organization</h3>
          <form onSubmit={saveOrg} className="mt-5 space-y-4">
            <div><Label className="label-overline">Name</Label><Input className="mt-2" value={orgForm.name} onChange={e=>setOrgForm({...orgForm, name: e.target.value})} data-testid="org-name-input" /></div>
            <div><Label className="label-overline">Address</Label><Input className="mt-2" value={orgForm.address} onChange={e=>setOrgForm({...orgForm, address: e.target.value})} /></div>
            <div><Label className="label-overline">Tax ID</Label><Input className="mt-2" value={orgForm.tax_id} onChange={e=>setOrgForm({...orgForm, tax_id: e.target.value})} /></div>
            <Button type="submit" className="btn-brand" data-testid="org-save-btn">Save</Button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 p-6">
          <h3 className="font-heading text-lg font-semibold">Billing</h3>
          <div className="mt-5 grid grid-cols-1 gap-3 text-sm">
            <div className="border border-slate-200 p-4">
              <div className="label-overline">Current plan</div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="font-heading text-2xl font-bold capitalize" data-testid="current-plan">{currentPlan}</div>
                <div className="text-xs text-slate-500">{currentPlan === "trial" ? "14-day free trial" : "Active"}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(plans).map(([key, p]) => (
                <div key={key} className={`border p-4 ${currentPlan === key ? "border-[#002FA7] bg-blue-50" : "border-slate-200"}`}>
                  <div className="font-heading font-semibold capitalize">{p.name}</div>
                  <div className="font-mono-tabular text-sm mt-1">₹{p.price_inr.toLocaleString("en-IN")}/mo</div>
                  <div className="text-[11px] text-slate-500 mt-1">Up to {p.max_drivers === 9999 ? "∞" : p.max_drivers} drivers</div>
                  {currentPlan === key ? (
                    <Button disabled variant="outline" size="sm" className="mt-3 w-full text-xs"><CheckCircle size={12} className="mr-1" weight="fill" /> Current</Button>
                  ) : (
                    <Button onClick={() => upgrade(key)} className="btn-brand mt-3 w-full text-xs" size="sm" data-testid={`plan-${key}-btn`}>
                      {currentPlan === "trial" ? "Subscribe" : "Switch"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {history.length > 0 && (
              <div className="mt-4">
                <div className="label-overline mb-2">Recent invoices</div>
                <div className="border border-slate-200 divide-y divide-slate-100">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.order_id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-mono-tabular text-slate-500">{h.order_id}</span>
                      <span className="capitalize">{h.plan}</span>
                      <span className="font-mono-tabular">₹{h.amount.toLocaleString("en-IN")}</span>
                      <span className={`uppercase tracking-wider text-[10px] ${h.status === "paid" ? "text-emerald-700" : "text-slate-500"}`}>{h.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {user?.roles?.includes("org_owner") && (
        <div className="bg-white border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold">Team members</h3>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="btn-brand" size="sm" data-testid="invite-user-btn"><Plus size={14} className="mr-2" /> Invite</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
                <form onSubmit={inviteUser} className="space-y-3">
                  <Input placeholder="Full name" required value={invite.full_name} onChange={e=>setInvite({...invite, full_name: e.target.value})} data-testid="invite-name" />
                  <Input placeholder="Email" type="email" required value={invite.email} onChange={e=>setInvite({...invite, email: e.target.value})} data-testid="invite-email" />
                  <Input placeholder="Temporary password" type="password" required minLength={8} value={invite.password} onChange={e=>setInvite({...invite, password: e.target.value})} data-testid="invite-password" />
                  <Select value={invite.roles[0]} onValueChange={v=>setInvite({...invite, roles:[v]})}>
                    <SelectTrigger data-testid="invite-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{["ops_manager","dispatcher","driver","customer"].map(r=><SelectItem key={r} value={r}>{r.replace("_"," ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="submit" className="btn-brand w-full" data-testid="invite-submit">Send invite</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="label-overline text-left"><th className="px-6 py-3">Name</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="px-6 py-3">{u.full_name}</td>
                  <td className="px-6 py-3 font-mono-tabular">{u.email}</td>
                  <td className="px-6 py-3 uppercase text-xs tracking-wider">{u.roles.join(", ").replace(/_/g, " ")}</td>
                  <td className="px-6 py-3 text-right">
                    {u.id !== user.id && <Button variant="ghost" size="icon" onClick={()=>removeUser(u.id)} data-testid={`remove-user-${u.id}`}><Trash size={14} /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
