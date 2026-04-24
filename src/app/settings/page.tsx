"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [importing, setImporting] = useState(false);

  const exportDb = () => {
    window.location.href = "/api/settings/export";
  };

  const importDb = async (file: File) => {
    setImporting(true);
    const form = new FormData();
    form.append("db", file);
    await fetch("/api/settings/import", { method: "POST", body: form });
    setImporting(false);
    alert("Import complete — restart container to reload");
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section>
        <h2 className="uppercase tracking-widest text-xs mb-2" style={{ color: "var(--ink-faded)" }}>Data</h2>
        <div className="flex gap-3">
          <button onClick={exportDb} className="px-4 py-2 rounded text-xs uppercase font-bold"
            style={{ background: "var(--accent)", color: "#f4ecd8" }}>Export DB</button>
          <label className="px-4 py-2 rounded text-xs uppercase cursor-pointer"
            style={{ background: "var(--paper-accent)", color: "var(--ink-soft)" }}>
            Import DB
            <input type="file" accept=".db" hidden onChange={(e) => { if (e.target.files?.[0]) importDb(e.target.files[0]); }} />
          </label>
          {importing && <span>Importing…</span>}
        </div>
      </section>
      <section>
        <h2 className="uppercase tracking-widest text-xs mb-2" style={{ color: "var(--ink-faded)" }}>About</h2>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>HealthMe v1 · Local-only personal health tracker.</p>
      </section>
    </div>
  );
}
