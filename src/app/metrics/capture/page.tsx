"use client";
import { useState } from "react";
import { PhotoReviewForm } from "@/components/photo-review-form";

export default function CapturePage() {
  const [preview, setPreview] = useState<null | { preview: Record<string, number>; photoPath: string; rawOcrJson: string }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch("/api/metrics/photo", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      const detail = await res.json();
      setError(detail.error ?? "upload_failed");
      setPreview({ preview: {}, photoPath: detail.photoPath ?? "", rawOcrJson: "" });
      return;
    }
    const json = await res.json();
    setPreview(json);
  };

  if (preview) return <PhotoReviewForm preview={preview.preview} photoPath={preview.photoPath} rawOcrJson={preview.rawOcrJson} />;

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold">Capture RENPHO Photo</h1>
      <label
        className="block border-2 border-dashed rounded p-10 text-center cursor-pointer"
        style={{ borderColor: "var(--divider)", color: "var(--ink-soft)" }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); }}
        />
        {loading ? "Reading values…" : "Tap to upload / drag file here"}
      </label>
      {error && <p style={{ color: "var(--accent)" }}>Error: {error}. Upload still saved — fill values manually.</p>}
    </div>
  );
}
