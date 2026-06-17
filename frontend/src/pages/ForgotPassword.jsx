import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Truck } from "@phosphor-icons/react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("If that email exists, a reset link has been sent.");
    } catch (err) { toast.error("Failed to send reset link"); }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center gap-2 mb-10"><div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center"><Truck size={18} weight="fill" color="white" /></div><div className="font-heading font-bold text-base">FLEETGRID</div></Link>
        <div className="label-overline">Forgot password</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-3">Reset your password.</h1>
        <p className="mt-3 text-slate-600">Enter your email and we'll send a reset link valid for 1 hour.</p>
        {sent ? (
          <div className="mt-8 p-6 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm" data-testid="forgot-sent">
            Check your inbox. The reset link will expire in 1 hour.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label className="label-overline">Email</Label>
              <Input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-2 h-12" data-testid="forgot-email-input" />
            </div>
            <Button type="submit" className="btn-brand w-full h-12" data-testid="forgot-submit">Send reset link</Button>
          </form>
        )}
        <p className="mt-6 text-sm"><Link to="/login" className="text-[#002FA7] hover:underline">Back to sign in</Link></p>
      </div>
    </div>
  );
}
