import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, Truck, MapTrifold, QrCode, ShieldCheck, Lightning } from "@phosphor-icons/react";
import { JOURNEYS, ADMIN_LINK, PERSONAS } from "../constants/personas";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
              <Truck size={18} weight="fill" color="white" />
            </div>
            <div className="font-heading font-bold text-base tracking-tight">FLEETGRID</div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#journeys" className="hover:text-[#002FA7]">Get started</a>
            <a href="#capabilities" className="hover:text-[#002FA7]">Capabilities</a>
            <a href="#track" className="hover:text-[#002FA7]">Track shipment</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login/business"><Button variant="ghost" size="sm">Business login</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24 text-center">
          <div className="label-overline mb-4">Fleet operating system</div>
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tighter max-w-4xl mx-auto">
            One platform. <span className="text-[#002FA7]">Three ways</span> to move parcels.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Whether you run a fleet, send a single package, or deliver on your own schedule — pick your path below.
          </p>
        </div>
      </section>

      {/* Three journeys */}
      <section id="journeys" className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="label-overline mb-3 text-center">Choose your journey</div>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-center max-w-2xl mx-auto">
            Sign up or sign in — we&apos;ll take you to the right place.
          </h2>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {JOURNEYS.map(({ persona, Icon, title, description, cta, login }) => {
              const p = PERSONAS[persona];
              return (
                <div key={persona}
                  className="border border-slate-200 bg-white p-8 flex flex-col hover:border-[#002FA7]/40 hover:shadow-lg transition-all group"
                  data-testid={`journey-${persona}`}
                >
                  <div className="w-12 h-12 flex items-center justify-center mb-6" style={{ backgroundColor: `${p.accent}15` }}>
                    <Icon size={28} weight="duotone" color={p.accent} />
                  </div>
                  <h3 className="font-heading text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">{description}</p>
                  <div className="mt-8 space-y-2">
                    <Link to={p.registerPath}>
                      <Button className="w-full h-11 text-white" style={{ backgroundColor: p.accent }}>
                        {cta} <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                    <Link to={p.loginPath}>
                      <Button variant="outline" className="w-full h-10 border-slate-300">{login}</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link to={ADMIN_LINK.path} className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800">
              <ADMIN_LINK.Icon size={14} /> {ADMIN_LINK.label}
            </Link>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="label-overline mb-3">Capabilities</div>
          <h2 className="font-heading text-4xl font-bold tracking-tight max-w-3xl">
            Built for operators, customers, and partners alike.
          </h2>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-slate-200">
            {[
              { I: Truck, t: "Fleet & dispatch", d: "Multi-tenant control room for owners, ops, and dispatchers." },
              { I: MapTrifold, t: "Live tracking", d: "Real-time GPS, offer-based assignment, and proof of delivery." },
              { I: QrCode, t: "Verification & POD", d: "Partner onboarding, document review, QR and photo evidence." },
              { I: ShieldCheck, t: "Tenant isolation", d: "Strict org scoping, RBAC, and immutable audit trails." },
              { I: Lightning, t: "On-demand parcels", d: "Individual customers book and track without a fleet account." },
            ].map(({ I, t, d }) => (
              <div key={t} className="border-r border-b border-slate-200 p-8">
                <I size={28} weight="duotone" color="#002FA7" />
                <div className="mt-6 font-heading font-semibold text-lg">{t}</div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Track */}
      <section id="track" className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-6">
            <div className="label-overline mb-3">Public tracking</div>
            <h2 className="font-heading text-4xl font-bold tracking-tight">Track any shipment — no login.</h2>
            <TrackForm />
          </div>
          <div className="col-span-12 lg:col-span-6 bg-[#0A0A0A] text-white p-10">
            <div className="label-overline text-slate-400">Demo accounts</div>
            <p className="mt-3 text-sm text-slate-300">Password: <span className="font-mono text-white">Password123!</span></p>
            <div className="mt-4 grid gap-2 text-sm font-mono">
              {["owner@acme.com — Business", "customer@acme.com — Customer", "driver@acme.com — Partner", "admin@fleetgrid.com — Admin (Admin123!)"].map((l) => (
                <div key={l} className="border border-slate-700 px-4 py-2">{l}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} FleetGrid
      </footer>
    </div>
  );
}

function TrackForm() {
  const [code, setCode] = React.useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) window.location.href = `/track/${code.trim()}`; }}
      className="mt-8 flex flex-col sm:flex-row gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TRK-XXXXXXXX"
        className="flex-1 h-12 border border-slate-300 px-4 font-mono text-sm" />
      <Button type="submit" className="btn-brand h-12 px-7">Track <ArrowRight size={16} className="ml-2" /></Button>
    </form>
  );
}
