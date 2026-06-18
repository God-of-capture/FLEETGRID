import React, { useCallback, useState } from "react";
import { UploadSimple, X } from "@phosphor-icons/react";

export default function FileUpload({ accept = "image/*,.pdf", onUpload, label, preview }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(preview || null);

  const handleFile = useCallback(async (file) => {
    if (!file || !onUpload) return;
    setUploading(true);
    try {
      const url = await onUpload(file);
      if (url && file.type.startsWith("image/")) setPreviewUrl(url);
      else if (url) setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors ${
        dragging ? "border-[#002FA7] bg-blue-50" : "border-slate-300 bg-slate-50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {previewUrl ? (
        <div className="relative inline-block">
          <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-sm" />
          <button type="button" onClick={() => setPreviewUrl(null)}
            className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <UploadSimple size={32} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">{label || "Drag & drop or click to upload"}</p>
        </>
      )}
      <label className="mt-3 inline-block">
        <span className="text-sm text-[#002FA7] font-medium cursor-pointer hover:underline">
          {uploading ? "Uploading…" : "Choose file"}
        </span>
        <input type="file" accept={accept} className="hidden" disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
    </div>
  );
}
