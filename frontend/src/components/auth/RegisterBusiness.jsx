import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";
import AuthShell from "./AuthShell";
import { PERSONAS } from "../../constants/personas";

export default function RegisterBusiness() {
  const { registerOrg } = useAuth();
  const navigate = useNavigate();
  const persona = PERSONAS.business;
  const [f, setF] = useState({
    org_name: "", org_slug: "", owner_full_name: "", owner_email: "", password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onSlugify = (e) => {
    const v = e.target.value;
    setF((x) => ({
      ...x, org_name: v,
      org_slug: x.org_slug || v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerOrg(f);
      toast.success("Workspace created. Welcome aboard.");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell persona={persona}
      image="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&q=80"
      imageCaption="Trusted by logistics operators worldwide"
    >
      <div className="label-overline">Business registration</div>
      <h2 className="font-heading text-4xl font-bold tracking-tight mt-3">{persona.register.title}</h2>
      <p className="mt-3 text-slate-600">{persona.register.subtitle}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label className="label-overline">Company name</Label>
          <Input required value={f.org_name} onChange={onSlugify} className="mt-2 h-11" placeholder="Acme Logistics" />
        </div>
        <div>
          <Label className="label-overline">Workspace slug</Label>
          <Input required value={f.org_slug} onChange={set("org_slug")} className="mt-2 h-11 font-mono-tabular" placeholder="acme" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="label-overline">Your name</Label>
            <Input required value={f.owner_full_name} onChange={set("owner_full_name")} className="mt-2 h-11" />
          </div>
          <div>
            <Label className="label-overline">Work email</Label>
            <Input required type="email" value={f.owner_email} onChange={set("owner_email")} className="mt-2 h-11" />
          </div>
        </div>
        <div>
          <Label className="label-overline">Password</Label>
          <Input required type="password" value={f.password} onChange={set("password")} minLength={8} className="mt-2 h-11" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full btn-brand h-12">
          {submitting ? "Creating…" : (<>Create workspace <ArrowRight size={16} className="ml-2" /></>)}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already registered? <Link to={persona.loginPath} className="text-[#002FA7] font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
