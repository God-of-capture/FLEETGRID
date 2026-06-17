import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Input } from "./ui/input";
import { MapPin } from "@phosphor-icons/react";

export default function AddressAutocomplete({ value, onChange, onPick, placeholder, testid }) {
  const [q, setQ] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (!q || q.length < 3) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.get(`/geocode`, { params: { q } })
        .then(r => { setResults(r.data.results || []); setOpen(true); })
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  const pick = (r) => {
    setQ(r.label); setOpen(false);
    onChange?.(r.label);
    onPick?.({ address: r.label, lat: r.lat, lng: r.lng, city: r.city });
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); onChange?.(e.target.value); }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || "Start typing an address…"}
          className="pl-9"
          data-testid={testid}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 max-h-64 overflow-y-auto shadow-lg">
          {results.map((r, i) => (
            <button
              type="button" key={i} onMouseDown={() => pick(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
              data-testid={`${testid}-result-${i}`}
            >
              <div className="truncate">{r.label}</div>
              <div className="text-[10px] text-slate-400 font-mono-tabular">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}{r.city ? ` · ${r.city}` : ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
