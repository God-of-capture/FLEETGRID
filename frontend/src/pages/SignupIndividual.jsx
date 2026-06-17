import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Truck, ArrowRight } from "@phosphor-icons/react";

export default function SignupIndividual() {
  const [f, setF] = useState({
    owner_full_name: "", owner_email: "", password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/auth/signup-individual", {
        org_name: f.owner_full_name,
        org_slug: "ignored",
        owner_full_name: f.owner_full_name,
        owner_email: f.owner_email,
        password: f.password,
      });
      localStorage.setItem("fleet_token", res.data.access_token);
      localStorage.setItem("fleet_user", JSON.stringify(res.data.user));
      localStorage.setItem("fleet_org", JSON.stringify(res.data.organization));
      window.location.href = "/send-parcel";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10" data-testid="brand-logo">
            <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
              <Truck size={18} weight="fill" color="white" />
            </div>
            <div className="font-heading font-bold text-base">FLEETGRID</div>
          </Link>
          <div className="label-overline">Get started</div>
          <h2 className="font-heading text-4xl font-bold tracking-tight mt-3">Create your account</h2>
          <p className="mt-3 text-slate-600">Send parcels in minutes</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label className="label-overline">Your name</Label>
              <Input
                required value={f.owner_full_name} onChange={set("owner_full_name")}
                className="mt-2 h-11 border-slate-300" placeholder="Jane Doe"
                data-testid="signup-individual-name"
              />
            </div>
            <div>
              <Label className="label-overline">Email</Label>
              <Input
                required type="email" value={f.owner_email} onChange={set("owner_email")}
                className="mt-2 h-11 border-slate-300" placeholder="jane@example.com"
                data-testid="signup-individual-email"
              />
            </div>
            <div>
              <Label className="label-overline">Password</Label>
              <Input
                required type="password" value={f.password} onChange={set("password")}
                className="mt-2 h-11 border-slate-300" placeholder="At least 8 characters" minLength={8}
                data-testid="signup-individual-password"
              />
            </div>
            <Button
              type="submit" disabled={submitting}
              className="w-full btn-brand h-12 mt-2" data-testid="signup-individual-submit"
            >
              {submitting ? "Creating account…" : (<>Create account <ArrowRight size={16} className="ml-2" /></>)}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already on FleetGrid?{" "}
            <Link to="/login" className="text-[#002FA7] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:block bg-slate-50 border-l border-slate-200 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHx3YXJlaG91c2UlMjBsb2dpc3RpY3N8ZW58MHx8fHwxNzgxNzE3MDQzfDA&ixlib=rb-4.1.0&q=85"
          alt="Warehouse"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <div className="label-overline" style={{ color: "#cbd5e1" }}>Send with confidence</div>
          <h3 className="font-heading text-3xl font-bold mt-2 leading-tight">
            From your door<br />to theirs.
          </h3>
        </div>
      </div>
    </div>
  );
}
