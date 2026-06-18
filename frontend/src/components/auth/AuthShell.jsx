import React from "react";
import { Link } from "react-router-dom";
import { Truck } from "@phosphor-icons/react";

export default function AuthShell({ persona, children, image, imageCaption }) {
  const accent = persona?.accent || "#002FA7";
  const hero = persona?.hero || {};

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      <div
        className="hidden lg:flex text-white p-12 flex-col justify-between relative overflow-hidden"
        style={{ backgroundColor: persona?.id === "admin" ? "#0A0A0A" : "#0A0A0A" }}
      >
        <Link to="/" className="flex items-center gap-2 z-10">
          <div className="w-8 h-8 flex items-center justify-center" style={{ backgroundColor: accent }}>
            <Truck size={18} weight="fill" color="white" />
          </div>
          <div className="font-heading font-bold text-base">FLEETGRID</div>
        </Link>
        <div className="z-10 max-w-md">
          <div className="label-overline" style={{ color: "#94A3B8" }}>{hero.tag}</div>
          <h1 className="font-heading text-5xl font-bold tracking-tight mt-4 leading-[1.05] whitespace-pre-line">
            {hero.title}
          </h1>
          {hero.highlight && (
            <p className="font-heading text-2xl font-bold mt-2" style={{ color: accent === "#0A0A0A" ? "#3B82F6" : accent }}>
              {hero.highlight}
            </p>
          )}
          <p className="mt-6 text-slate-300 text-sm leading-relaxed">{hero.body}</p>
        </div>
        {image ? (
          <div className="z-10 relative h-48 border border-slate-700 overflow-hidden">
            <img src={image} alt="" className="w-full h-full object-cover opacity-80" />
            {imageCaption && (
              <div className="absolute bottom-0 inset-x-0 p-4 bg-black/60 text-xs">{imageCaption}</div>
            )}
          </div>
        ) : (
          <div className="z-10 text-xs text-slate-500 font-mono-tabular">{persona?.label}</div>
        )}
      </div>

      <div className="flex items-center justify-center p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
                <Truck size={18} weight="fill" color="white" />
              </div>
              <div className="font-heading font-bold text-base">FLEETGRID</div>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
