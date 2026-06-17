import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Truck, ArrowRight } from "@phosphor-icons/react";

export default function Register() {
  const { registerOrg } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    org_name: "", org_slug: "", owner_full_name: "", owner_email: "", password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

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
          <h2 className="font-heading text-4xl font-bold tracking-tight mt-3">Create your workspace.</h2>
          <p className="mt-3 text-slate-600">14-day free trial. No card required.</p>

          {sent ? (
            <div className="mt-8 p-6 border border-emerald-200 bg-emerald-50" data-testid="register-success">
              <div className="font-heading font-semibold text-emerald-900">Check your inbox</div>
              <p className="mt-2 text-sm text-emerald-800">
                We sent a verification link to <b className="font-mono-tabular">{f.owner_email}</b>. Open it to activate your workspace, then sign in.
              </p>
              <Link to="/login"><Button className="btn-brand mt-5" data-testid="register-goto-login">Back to sign in</Button></Link>
            </div>
          ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label className="label-overline">Company name</Label>
              <Input
                required value={f.org_name} onChange={onSlugify}
                className="mt-2 h-11 border-slate-300" placeholder="Acme Logistics"
                data-testid="register-org-name"
              />
            </div>
            <div>
              <Label className="label-overline">Workspace slug</Label>
              <Input
                required value={f.org_slug} onChange={set("org_slug")}
                className="mt-2 h-11 border-slate-300 font-mono-tabular" placeholder="acme"
                data-testid="register-org-slug"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="label-overline">Your name</Label>
                <Input required value={f.owner_full_name} onChange={set("owner_full_name")}
                  className="mt-2 h-11 border-slate-300" placeholder="Jane Doe"
                  data-testid="register-name"
                />
              </div>
              <div>
                <Label className="label-overline">Work email</Label>
                <Input required type="email" value={f.owner_email} onChange={set("owner_email")}
                  className="mt-2 h-11 border-slate-300" placeholder="jane@acme.com"
                  data-testid="register-email"
                />
              </div>
            </div>
            <div>
              <Label className="label-overline">Password</Label>
              <Input required type="password" value={f.password} onChange={set("password")}
                className="mt-2 h-11 border-slate-300" placeholder="At least 8 characters" minLength={8}
                data-testid="register-password"
              />
            </div>
            <Button
              type="submit" disabled={submitting}
              className="w-full btn-brand h-12 mt-2" data-testid="register-submit"
            >
              {submitting ? "Creating workspace…" : (<>Create workspace <ArrowRight size={16} className="ml-2" /></>)}
            </Button>
          </form>
          )}

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
          <div className="label-overline" style={{ color: "#cbd5e1" }}>Trusted by operators</div>
          <h3 className="font-heading text-3xl font-bold mt-2 leading-tight">
            From the first parcel<br />to the thousandth.
          </h3>
        </div>
      </div>
    </div>
  );
}
