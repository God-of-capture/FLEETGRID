import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Truck, ArrowRight } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setNeedsVerify(false);
    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.user.full_name}`);
      const roles = data.user.roles;
      if (roles.includes("driver")) navigate("/driver");
      else if (roles.includes("customer")) navigate("/portal");
      else navigate("/app/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Login failed";
      if (err?.response?.status === 403 && detail.toLowerCase().includes("email not verified")) {
        setNeedsVerify(true);
      }
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const resendVerify = async () => {
    try {
      await api.post("/auth/resend-verification", { email });
      toast.success("Verification email sent. Check your inbox.");
    } catch { toast.error("Could not send verification email"); }
  };

  const quickFill = (em) => { setEmail(em); setPassword("Password123!"); };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex bg-[#0A0A0A] text-white p-12 flex-col justify-between relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2 z-10" data-testid="brand-logo">
          <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
            <Truck size={18} weight="fill" color="white" />
          </div>
          <div className="font-heading font-bold text-base">FLEETGRID</div>
        </Link>
        <div className="z-10">
          <div className="label-overline" style={{ color: "#94A3B8" }}>01 — The control room</div>
          <h1 className="font-heading text-5xl font-bold tracking-tight mt-4 leading-[1.05]">
            Dispatch with<br /> precision.<br />
            <span className="text-[#3B82F6]">Deliver with proof.</span>
          </h1>
          <p className="mt-6 text-slate-300 max-w-md text-sm">
            Sign in to your workspace to dispatch drivers, track vehicles, and own every minute of the delivery.
          </p>
        </div>
        <div className="z-10 grid grid-cols-2 gap-3 text-xs font-mono-tabular">
          {[
            ["owner@acme.com", "Org Owner"],
            ["dispatcher@acme.com", "Dispatcher"],
            ["driver@acme.com", "Driver"],
            ["customer@acme.com", "Customer"],
          ].map(([em, r]) => (
            <button
              key={em}
              onClick={() => quickFill(em)}
              data-testid={`quickfill-${r.toLowerCase()}`}
              className="text-left border border-slate-700 hover:border-[#3B82F6] px-3 py-2 transition-colors"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{r}</div>
              <div className="mt-1">{em}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <Link to="/" className="flex items-center gap-2" data-testid="brand-logo-mobile">
              <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
                <Truck size={18} weight="fill" color="white" />
              </div>
              <div className="font-heading font-bold text-base">FLEETGRID</div>
            </Link>
          </div>
          <div className="label-overline">Sign in</div>
          <h2 className="font-heading text-4xl font-bold tracking-tight mt-3">Welcome back.</h2>
          <p className="mt-3 text-slate-600">Enter your credentials to access your workspace.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <Label htmlFor="email" className="label-overline">Email</Label>
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="mt-2 h-12 border-slate-300" placeholder="you@company.com"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="label-overline">Password</Label>
              <Input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required
                className="mt-2 h-12 border-slate-300" placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>
            <Button
              type="submit" size="lg" disabled={submitting}
              className="w-full btn-brand h-12" data-testid="login-submit-btn"
            >
              {submitting ? "Signing in…" : (<>Sign in <ArrowRight size={16} className="ml-2" /></>)}
            </Button>
            {needsVerify && (
              <div className="rounded-none border border-amber-200 bg-amber-50 p-4 text-sm" data-testid="verify-banner">
                <div className="font-medium text-amber-900">Email not verified.</div>
                <div className="text-amber-800 mt-1">Check your inbox or </div>
                <button type="button" onClick={resendVerify} className="text-amber-900 underline mt-1" data-testid="resend-verify-btn">
                  resend the verification email
                </button>
              </div>
            )}
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-[#002FA7]" data-testid="forgot-link">
                Forgot password?
              </Link>
            </div>
          </form>

          <p className="mt-8 text-sm text-slate-600">
            New here?{" "}
            <Link to="/register" className="text-[#002FA7] font-medium hover:underline" data-testid="register-link">
              Create an organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
