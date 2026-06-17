import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, Truck } from "@phosphor-icons/react";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState("loading"); // loading | ok | err
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("err"); setMsg("Missing token."); return; }
    api.post("/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch((e) => { setState("err"); setMsg(e?.response?.data?.detail || "Verification failed."); });
  }, [params]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center"><Truck size={18} weight="fill" color="white" /></div>
          <div className="font-heading font-bold text-base">FLEETGRID</div>
        </Link>
        {state === "loading" && <div className="label-overline">Verifying your email…</div>}
        {state === "ok" && (
          <>
            <CheckCircle size={56} weight="fill" color="#10B981" className="mx-auto" />
            <h1 className="font-heading text-3xl font-bold tracking-tight mt-6">Email verified.</h1>
            <p className="mt-3 text-slate-600">Your workspace is ready. Sign in to continue.</p>
            <Link to="/login"><Button className="btn-brand mt-6" data-testid="goto-login">Continue to sign in</Button></Link>
          </>
        )}
        {state === "err" && (
          <>
            <XCircle size={56} weight="fill" color="#EF4444" className="mx-auto" />
            <h1 className="font-heading text-3xl font-bold tracking-tight mt-6">Verification failed</h1>
            <p className="mt-3 text-slate-600">{msg}</p>
            <Link to="/login"><Button variant="outline" className="mt-6">Back to sign in</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
