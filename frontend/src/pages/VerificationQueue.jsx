import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { StatusPill } from "../components/StatusPill";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowCounterClockwise } from "@phosphor-icons/react";

const VSTATUS = {
  pending: "pending", docs_review: "assigned", approved: "delivered",
  rejected: "failed", active: "delivered", suspended: "cancelled",
};

export default function VerificationQueue() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/admin/verification/queue").then((r) => setData(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const review = async (action) => {
    if (!selected) return;
    try {
      await api.post(`/admin/verification/${selected.id}/review`, {
        action, verification_notes: notes, rejection_reason: reason,
      });
      toast.success(`Application ${action}`);
      setSelected(null); setNotes(""); setReason("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Review failed");
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>;

  const items = data?.items || [];

  return (
    <div className="space-y-6" data-testid="verification-queue">
      <div>
        <div className="label-overline">Partner verification</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Review queue</h1>
        <p className="text-sm text-slate-600 mt-1">{data?.total || 0} pending applications</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center text-slate-500">No applications pending review.</div>
      ) : (
        <div className="bg-white border border-slate-200 divide-y divide-slate-200">
          {items.map((ob) => (
            <div key={ob.id} className="p-5 flex items-center justify-between hover:bg-slate-50">
              <div>
                <div className="font-heading font-semibold">{ob.full_name || "Unnamed"}</div>
                <div className="text-xs text-slate-500 mt-1">{ob.email} · {ob.phone}</div>
                <div className="text-xs text-slate-500">{ob.vehicle_type} · {ob.registration_number}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={VSTATUS[ob.verification_status] || ob.verification_status} />
                <Button size="sm" variant="outline" onClick={() => setSelected(ob)}>Review</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review application — {selected?.full_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Phone</span><p>{selected.phone}</p></div>
                <div><span className="text-slate-500">Vehicle</span><p>{selected.vehicle_type} · {selected.registration_number}</p></div>
                <div><span className="text-slate-500">Address</span><p>{selected.address_line}, {selected.city}</p></div>
                <div><span className="text-slate-500">ID</span><p>{selected.id_type}: {selected.id_number}</p></div>
              </div>
              <div>
                <div className="label-overline mb-2">Documents ({selected.documents?.length || 0})</div>
                <div className="grid grid-cols-2 gap-3">
                  {(selected.documents || []).map((doc) => (
                    <a key={doc.id} href={doc.storage_url} target="_blank" rel="noreferrer"
                      className="border border-slate-200 p-3 text-xs hover:border-[#002FA7]">
                      <div className="font-medium uppercase">{doc.doc_type.replace("_", " ")}</div>
                      {doc.content_type?.startsWith("image/") && (
                        <img src={doc.storage_url} alt={doc.doc_type} className="mt-2 max-h-24 object-cover" />
                      )}
                    </a>
                  ))}
                </div>
              </div>
              <Textarea placeholder="Reviewer notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Textarea placeholder="Rejection reason (if rejecting)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <Button className="btn-brand flex-1" onClick={() => review("approve")}>
                  <CheckCircle size={16} className="mr-1" /> Approve
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => review("request_resubmit")}>
                  <ArrowCounterClockwise size={16} className="mr-1" /> Request resubmit
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => review("reject")}>
                  <XCircle size={16} className="mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
