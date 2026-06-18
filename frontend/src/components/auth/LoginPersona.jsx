import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";
import AuthShell from "./AuthShell";
import { PERSONAS, matchesPersona, resolvePostLogin } from "../../constants/personas";

export default function LoginPersona({ personaId }) {
  const persona = PERSONAS[personaId];
  const { login, logout } = useAuth();
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
      if (!matchesPersona(data.user, personaId)) {
        logout();
        toast.error(`This account isn't a ${persona.shortLabel} account. ${persona.wrongRoleHint}`);
        return;
      }
      toast.success(`Welcome back, ${data.user.full_name}`);
      navigate(resolvePostLogin(data.user, personaId));
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
      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not send verification email");
    }
  };

  const otherLogins = Object.values(PERSONAS).filter(
    (p) => p.loginPath && p.id !== personaId && p.id !== "admin"
  );

  return (
    <AuthShell persona={persona}>
      <div className="label-overline">{persona.shortLabel} sign in</div>
      <h2 className="font-heading text-4xl font-bold tracking-tight mt-3">Welcome back.</h2>
      <p className="mt-3 text-slate-600">{persona.label} portal</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <div>
          <Label className="label-overline">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-2 h-12 border-slate-300" placeholder="you@example.com" />
        </div>
        <div>
          <Label className="label-overline">Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mt-2 h-12 border-slate-300" placeholder="••••••••" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full btn-brand h-12">
          {submitting ? "Signing in…" : (<>Sign in <ArrowRight size={16} className="ml-2" /></>)}
        </Button>
        {needsVerify && (
          <div className="border border-amber-200 bg-amber-50 p-4 text-sm">
            <button type="button" onClick={resendVerify} className="underline">Resend verification email</button>
          </div>
        )}
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-[#002FA7]">Forgot password?</Link>
        </div>
      </form>

      {persona.registerPath && (
        <p className="mt-8 text-sm text-slate-600">
          New here?{" "}
          <Link to={persona.registerPath} className="font-medium hover:underline" style={{ color: persona.accent }}>
            {persona.register.cta || "Create account"}
          </Link>
        </p>
      )}

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="text-xs text-slate-500 mb-2">Sign in as</div>
        <div className="flex flex-wrap gap-2">
          {otherLogins.map((p) => (
            <Link key={p.id} to={p.loginPath}
              className="text-xs border border-slate-200 px-3 py-1.5 hover:border-slate-400 transition-colors">
              {p.shortLabel}
            </Link>
          ))}
          <Link to="/" className="text-xs border border-slate-200 px-3 py-1.5 hover:border-slate-400">Home</Link>
        </div>
      </div>
    </AuthShell>
  );
}
