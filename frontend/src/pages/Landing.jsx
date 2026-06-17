import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, Truck, MapTrifold, ChartLine, QrCode, ShieldCheck, Lightning } from "@phosphor-icons/react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      {/* Header */}
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
              <Truck size={18} weight="fill" color="white" />
            </div>
            <div className="font-heading font-bold text-base tracking-tight">FLEETGRID</div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#capabilities" className="hover:text-[#002FA7]">Capabilities</a>
            <a href="#roles" className="hover:text-[#002FA7]">Roles</a>
            <a href="#track" className="hover:text-[#002FA7]">Track shipment</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm" data-testid="header-login">Log in</Button></Link>
            <Link to="/register">
              <Button size="sm" className="btn-brand" data-testid="header-signup">Start free trial</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-12 gap-8 py-20 lg:py-28">
          <div className="col-span-12 lg:col-span-7">
            <div className="label-overline mb-6">Fleet Operating System / v 1.0</div>
            <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tighter">
              Move every<br />
              package with<br />
              <span className="text-[#002FA7]">surgical precision.</span>
            </h1>
            <p className="mt-8 text-lg text-slate-700 max-w-xl leading-relaxed">
              FleetGrid is the multi-tenant operating system that logistics teams use to dispatch drivers,
              track vehicles in real time, and prove every delivery — at industrial scale.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link to="/register">
                <Button size="lg" className="btn-brand h-12 px-7" data-testid="hero-cta-signup">
                  Start free trial <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-7 border-[#0A0A0A]" data-testid="hero-cta-login">
                  Sign in
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[["02", "Tenants live"], ["14", "Vehicles tracked"], ["99.98%", "Uptime"]].map(([n, l]) => (
                <div key={l}>
                  <div className="font-heading font-bold text-2xl">{n}</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5 relative">
            <div className="aspect-[4/5] bg-slate-100 border border-slate-200 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1775637483812-25ce67beeb3d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwzfHxkZWxpdmVyeSUyMHZhbiUyMG1vZGVybnxlbnwwfHx8fDE3ODE3MTcwNDR8MA&ixlib=rb-4.1.0&q=85"
                alt="Modern delivery van"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-white/90 backdrop-blur border-t border-slate-200">
                <div className="label-overline">Live shipment / TRK-DEMO123</div>
                <div className="mt-2 font-mono-tabular text-sm">
                  Out for delivery • ETA 14:32 • Mumbai
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="label-overline mb-3">01 — Capabilities</div>
          <h2 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl">
            Everything a logistics team needs to ship faster, prove delivery, and grow.
          </h2>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-slate-200">
            {[
              { I: Truck, t: "Fleet & maintenance", d: "Vehicle records, capacity, fuel, insurance and service reminders — all auditable." },
              { I: MapTrifold, t: "Live GPS tracking", d: "Real-time driver locations on a clean monochrome map with route history and ETAs." },
              { I: QrCode, t: "QR proof of delivery", d: "Scan, capture signature & photo, geo-stamp every drop. Disputes vanish." },
              { I: ChartLine, t: "Analytics that matter", d: "Driver efficiency, fleet utilisation, failure reasons and revenue trends." },
              { I: ShieldCheck, t: "Multi-tenant by design", d: "Strict org_id scoping, RBAC across 6 roles and an immutable audit trail." },
              { I: Lightning, t: "Built for speed", d: "Operations dashboards engineered for dispatchers running 1000s of deliveries." },
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

      {/* Roles */}
      <section id="roles" className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
          <div className="label-overline mb-3">02 — Built for every role</div>
          <h2 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl">
            One platform, six purpose-built portals.
          </h2>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-l border-t border-slate-300">
            {[
              ["Org Owner", "Run the business"],
              ["Ops Manager", "Run the fleet"],
              ["Dispatcher", "Run the day"],
              ["Driver", "Run the route"],
              ["Customer", "Track the box"],
              ["Super Admin", "Run the platform"],
            ].map(([role, sub]) => (
              <div key={role} className="border-r border-b border-slate-300 p-6 bg-white">
                <div className="label-overline text-[#002FA7]">{role}</div>
                <div className="mt-3 font-heading text-lg font-medium">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Track shipment */}
      <section id="track" className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-6">
            <div className="label-overline mb-3">03 — For your customers</div>
            <h2 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight">
              Public tracking, no login required.
            </h2>
            <p className="mt-6 text-slate-700">
              Share a tracking code with your customer — they see live status, driver details, and a map of the drop-off.
            </p>
            <TrackForm />
          </div>
          <div className="col-span-12 lg:col-span-6 bg-[#0A0A0A] text-white p-10">
            <div className="label-overline" style={{ color: "#94A3B8" }}>Demo workspace</div>
            <h3 className="mt-4 font-heading text-2xl font-semibold">Try Acme Logistics</h3>
            <p className="mt-3 text-slate-300 text-sm">Use any of the following accounts. Password for all: <span className="font-mono-tabular text-white">Password123!</span></p>
            <div className="mt-6 grid grid-cols-1 gap-2 text-sm font-mono-tabular">
              {[
                "owner@acme.com — Org Owner",
                "dispatcher@acme.com — Dispatcher",
                "driver@acme.com — Driver",
                "customer@acme.com — Customer",
              ].map((l) => (
                <div key={l} className="border border-slate-700 px-4 py-2.5">{l}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="font-heading font-bold text-[#0A0A0A]">FLEETGRID</div>
          <div>© {new Date().getFullYear()} FleetGrid. Built for operators.</div>
        </div>
      </footer>
    </div>
  );
}

function TrackForm() {
  const [code, setCode] = React.useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) window.location.href = `/track/${code.trim()}`; }}
      className="mt-8 flex flex-col sm:flex-row gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter tracking code, e.g. TRK-XXXXXXXX"
        className="flex-1 h-12 border border-[#0A0A0A] bg-white px-4 outline-none focus:ring-2 focus:ring-[#002FA7]/30 font-mono-tabular text-sm"
        data-testid="landing-track-input"
      />
      <Button type="submit" size="lg" className="btn-brand h-12 px-7" data-testid="landing-track-submit">
        Track <ArrowRight size={16} className="ml-2" />
      </Button>
    </form>
  );
}
