import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Truck } from "@phosphor-icons/react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) return toast.error("Passwords don't match");
    try {
      await api.post("/auth/reset-password", { token, password: pw });
      toast.success("Password reset. Please sign in.");
      navigate("/login");
    } catch (err) { toast.error(err?.response?.data?.detail || "Reset failed"); }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center gap-2 mb-10"><div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center"><Truck size={18} weight="fill" color="white" /></div><div className="font-heading font-bold text-base">FLEETGRID</div></Link>
        <div className="label-overline">Reset password</div>
        <h1 className="font-heading text-4xl font-bold tracking-tight mt-3">Choose a new password.</h1>
        {!token && <p className="mt-3 text-red-600 text-sm">Missing reset token.</p>}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div><Label className="label-overline">New password</Label>
            <Input required type="password" minLength={8} value={pw} onChange={(e)=>setPw(e.target.value)} className="mt-2 h-12" data-testid="reset-pw-input" /></div>
          <div><Label className="label-overline">Confirm password</Label>
            <Input required type="password" minLength={8} value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="mt-2 h-12" data-testid="reset-confirm-input" /></div>
          <Button type="submit" disabled={!token} className="btn-brand w-full h-12" data-testid="reset-submit">Reset password</Button>
        </form>
      </div>
    </div>
  );
}
