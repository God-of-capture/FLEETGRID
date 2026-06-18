import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";
import AuthShell from "./AuthShell";
import { PERSONAS } from "../../constants/personas";

export default function RegisterDriver() {
  const persona = PERSONAS.driver;
  const [f, setF] = useState({ owner_full_name: "", owner_email: "", password: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/auth/signup-partner", {
        org_name: f.owner_full_name,
        org_slug: "ignored",
        owner_full_name: f.owner_full_name,
        owner_email: f.owner_email,
        password: f.password,
      });
      localStorage.setItem("fleet_token", res.data.access_token);
      localStorage.setItem("fleet_user", JSON.stringify(res.data.user));
      localStorage.setItem("fleet_org", JSON.stringify(res.data.organization));
      toast.success("Account created! Complete your verification profile.");
      window.location.href = "/partner/onboarding";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell persona={persona}
      image="https://images.unsplash.com/photo-1775637483812-25ce67beeb3d?w=800&q=80"
      imageCaption="Join the delivery partner network"
    >
      <div className="label-overline">Partner registration</div>
      <h2 className="font-heading text-4xl font-bold tracking-tight mt-3">{persona.register.title}</h2>
      <p className="mt-3 text-slate-600">{persona.register.subtitle}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label className="label-overline">Full name</Label>
          <Input required value={f.owner_full_name} onChange={set("owner_full_name")} className="mt-2 h-11" />
        </div>
        <div>
          <Label className="label-overline">Email</Label>
          <Input required type="email" value={f.owner_email} onChange={set("owner_email")} className="mt-2 h-11" />
        </div>
        <div>
          <Label className="label-overline">Phone</Label>
          <Input required value={f.phone} onChange={set("phone")} className="mt-2 h-11" placeholder="+91-9876543210" />
        </div>
        <div>
          <Label className="label-overline">Password</Label>
          <Input required type="password" value={f.password} onChange={set("password")} minLength={8} className="mt-2 h-11" />
        </div>
        <p className="text-xs text-slate-500">Next: upload ID, vehicle docs, and selfie for verification.</p>
        <Button type="submit" disabled={submitting} className="w-full h-12 text-white" style={{ backgroundColor: persona.accent }}>
          {submitting ? "Creating…" : (<>Start application <ArrowRight size={16} className="ml-2" /></>)}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already a partner? <Link to={persona.loginPath} style={{ color: persona.accent }} className="font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
