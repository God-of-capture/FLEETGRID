import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import FileUpload from "../components/FileUpload";
import { toast } from "sonner";
import { Truck, ArrowRight, ArrowLeft, CheckCircle } from "@phosphor-icons/react";

const STEPS = [
  "Personal info", "Address", "Government ID", "Selfie",
  "Vehicle", "Documents", "Vehicle photos", "Review",
];

export default function PartnerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [ob, setOb] = useState(null);
  const [docs, setDocs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/partner/onboarding/me").then((r) => {
      setOb(r.data);
      setStep(Math.max(1, r.data.current_step || 1));
      setForm(r.data);
    });
    api.get("/partner/onboarding/documents").then((r) => setDocs(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const saveStep = async (nextStep) => {
    const data = {};
    if (step === 1) Object.assign(data, {
      full_name: form.full_name, email: form.email, phone: form.phone, date_of_birth: form.date_of_birth,
    });
    if (step === 2) Object.assign(data, {
      address_line: form.address_line, city: form.city, state: form.state, postal_code: form.postal_code,
    });
    if (step === 3) Object.assign(data, { id_number: form.id_number, id_type: form.id_type });
    if (step === 5) Object.assign(data, {
      vehicle_type: form.vehicle_type, registration_number: form.registration_number,
      capacity_kg: parseFloat(form.capacity_kg) || 0, license_number: form.license_number,
    });
    if ([1, 2, 3, 5].includes(step)) {
      await api.patch("/partner/onboarding/step", { step, data });
      toast.success("Progress saved");
    }
    setStep(nextStep);
    load();
  };

  const uploadDoc = async (docType, file) => {
    const fd = new FormData();
    fd.append("doc_type", docType);
    fd.append("file", file);
    const res = await api.post("/partner/onboarding/documents", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    load();
    return res.data.storage_url;
  };

  const submitAll = async () => {
    setSubmitting(true);
    try {
      await api.post("/partner/onboarding/submit");
      toast.success("Application submitted for review");
      navigate("/partner/onboarding");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ob) return <div className="p-12 text-center text-slate-500">Loading…</div>;

  if (ob.verification_status === "approved" || ob.verification_status === "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md text-center bg-white border border-slate-200 p-10">
          <CheckCircle size={48} className="mx-auto text-emerald-600" weight="fill" />
          <h1 className="font-heading text-2xl font-bold mt-4">You're approved!</h1>
          <p className="mt-2 text-slate-600">Start accepting delivery offers from your jobs feed.</p>
          <Link to="/driver/jobs"><Button className="btn-brand mt-6">View available jobs</Button></Link>
        </div>
      </div>
    );
  }

  if (ob.verification_status === "docs_review") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md text-center bg-white border border-slate-200 p-10">
          <h1 className="font-heading text-2xl font-bold">Under review</h1>
          <p className="mt-2 text-slate-600">Your application is being reviewed. We'll notify you when a decision is made.</p>
        </div>
      </div>
    );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-[#002FA7] flex items-center justify-center">
            <Truck size={18} weight="fill" color="white" />
          </div>
          <div className="font-heading font-bold">Partner onboarding</div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Step {step} of {STEPS.length}</span>
            <span>{STEPS[step - 1]}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#002FA7] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold">Personal information</h2>
              <div><Label className="label-overline">Full name</Label>
                <Input className="mt-2" value={form.full_name || user?.full_name || ""} onChange={set("full_name")} required /></div>
              <div><Label className="label-overline">Email</Label>
                <Input type="email" className="mt-2" value={form.email || user?.email || ""} onChange={set("email")} required /></div>
              <div><Label className="label-overline">Phone</Label>
                <Input className="mt-2" value={form.phone || ""} onChange={set("phone")} required /></div>
              <div><Label className="label-overline">Date of birth</Label>
                <Input type="date" className="mt-2" value={form.date_of_birth || ""} onChange={set("date_of_birth")} required /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold">Residential address</h2>
              <div><Label className="label-overline">Address</Label>
                <Input className="mt-2" value={form.address_line || ""} onChange={set("address_line")} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="label-overline">City</Label>
                  <Input className="mt-2" value={form.city || ""} onChange={set("city")} required /></div>
                <div><Label className="label-overline">State</Label>
                  <Input className="mt-2" value={form.state || ""} onChange={set("state")} required /></div>
              </div>
              <div><Label className="label-overline">Postal code</Label>
                <Input className="mt-2" value={form.postal_code || ""} onChange={set("postal_code")} required /></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold">Government ID</h2>
              <div><Label className="label-overline">ID type</Label>
                <Select value={form.id_type || ""} onValueChange={(v) => setForm({ ...form, id_type: v })}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select ID type" /></SelectTrigger>
                  <SelectContent>
                    {["Aadhaar", "PAN", "Driving License", "Passport"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select></div>
              <div><Label className="label-overline">ID number</Label>
                <Input className="mt-2" value={form.id_number || ""} onChange={set("id_number")} required /></div>
              <FileUpload label="Upload ID document" onUpload={(f) => uploadDoc("government_id", f)} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold">Selfie verification</h2>
              <p className="text-sm text-slate-600">Take a clear selfie for identity verification.</p>
              <FileUpload label="Upload selfie" accept="image/*" onUpload={(f) => uploadDoc("selfie", f)} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold">Vehicle details</h2>
              <div><Label className="label-overline">Vehicle type</Label>
                <Select value={form.vehicle_type || ""} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["bike", "car", "van", "truck"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select></div>
              <div><Label className="label-overline">Registration number</Label>
                <Input className="mt-2" value={form.registration_number || ""} onChange={set("registration_number")} required /></div>
              <div><Label className="label-overline">Capacity (kg)</Label>
                <Input type="number" className="mt-2" value={form.capacity_kg || ""} onChange={set("capacity_kg")} /></div>
              <div><Label className="label-overline">License number</Label>
                <Input className="mt-2" value={form.license_number || ""} onChange={set("license_number")} required /></div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold">RC & Insurance</h2>
              <div><Label className="label-overline">Registration Certificate (RC)</Label>
                <FileUpload onUpload={(f) => uploadDoc("rc", f)} /></div>
              <div><Label className="label-overline">Insurance document</Label>
                <FileUpload onUpload={(f) => uploadDoc("insurance", f)} /></div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <h2 className="font-heading text-xl font-bold">Vehicle photographs</h2>
              <div><Label className="label-overline">Front view</Label>
                <FileUpload accept="image/*" onUpload={(f) => uploadDoc("vehicle_front", f)} /></div>
              <div><Label className="label-overline">Rear view</Label>
                <FileUpload accept="image/*" onUpload={(f) => uploadDoc("vehicle_rear", f)} /></div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <h2 className="font-heading text-xl font-bold">Review & submit</h2>
              <div className="text-sm space-y-2 text-slate-700">
                <p><b>Name:</b> {form.full_name}</p>
                <p><b>Phone:</b> {form.phone}</p>
                <p><b>Vehicle:</b> {form.vehicle_type} · {form.registration_number}</p>
                <p><b>Documents uploaded:</b> {docs.length}</p>
              </div>
              <Button className="btn-brand w-full" onClick={submitAll} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            <Button variant="ghost" disabled={step <= 1} onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            {step < 8 && (
              <Button className="btn-brand" onClick={() => saveStep(step + 1)}>
                Continue <ArrowRight size={16} className="ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
