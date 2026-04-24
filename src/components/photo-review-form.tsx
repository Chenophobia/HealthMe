"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { METRIC_FIELDS, type MetricKey } from "@/lib/metric-fields";

interface Props {
  preview: Partial<Record<MetricKey, number>>;
  photoPath: string;
  rawOcrJson?: string;
}

export function PhotoReviewForm({ preview, photoPath, rawOcrJson }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Partial<Record<MetricKey, number | "">>>({ ...preview });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { source: "PHOTO", photoPath, rawOcrJson };
    for (const [k, v] of Object.entries(values)) {
      if (v !== "" && v != null) payload[k] = Number(v);
    }
    const res = await fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) router.push("/metrics");
    else alert("Save failed");
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoPath} alt="RENPHO screenshot" className="rounded w-full" />
      <div className="space-y-2">
        <h2 className="font-bold text-lg mb-2">Review parsed values</h2>
        {METRIC_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <label className="flex-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              {f.label}
            </label>
            <input
              type="number"
              step="0.01"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value === "" ? "" : Number(e.target.value) })}
              className="px-2 py-1 w-28 rounded text-right"
              style={{ background: "var(--paper-accent)", color: "var(--ink)", border: "1px solid var(--divider)" }}
            />
            <span className="text-xs w-10" style={{ color: "var(--ink-faded)" }}>{f.unit}</span>
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-bold uppercase"
            style={{ background: "var(--accent)", color: "#f4ecd8" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded text-sm uppercase"
            style={{ background: "var(--paper-accent)", color: "var(--ink-soft)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
