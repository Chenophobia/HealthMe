"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActivityEntry({ initialKcal }: { initialKcal: number }) {
  const router = useRouter();
  const [kcal, setKcal] = useState(initialKcal);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, activeKcal: Math.max(0, Math.round(kcal)), source: "MANUAL" }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(Date.now());
      router.refresh();
    } else {
      alert("Save failed");
    }
  };

  return (
    <div
      className="px-5 py-3 rounded grid grid-cols-[1fr_auto_auto] gap-3 items-center"
      style={{ background: "var(--paper-accent)" }}
    >
      <div>
        <div className="text-[10px] tracking-widest uppercase font-bold" style={{ color: "var(--ink-faded)" }}>
          Today&apos;s active kcal (Apple Health / fitness ring)
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
          Manual entry. iOS Shortcut auto-fills daily — see README.
        </div>
      </div>
      <input
        type="number"
        value={kcal}
        onChange={(e) => setKcal(Number(e.target.value))}
        className="w-28 px-3 py-2 rounded text-right font-bold text-lg"
        style={{ background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--divider)" }}
      />
      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded text-xs uppercase tracking-widest font-bold"
        style={{ background: "var(--accent)", color: "#f4ecd8", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Saving…" : savedAt && Date.now() - savedAt < 3000 ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
