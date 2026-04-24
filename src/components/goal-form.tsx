"use client";
import { useState } from "react";
import { METRIC_FIELDS } from "@/lib/metric-fields";

export function GoalForm({ onClose }: { onClose: () => void }) {
  const goalable = METRIC_FIELDS.filter((f) => f.goalEnum);
  const [metric, setMetric] = useState<string>(goalable[0]?.goalEnum ?? "WEIGHT_KG");
  const [targetValue, setTargetValue] = useState(0);
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10));

  const save = async () => {
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric, targetValue, targetDate }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="p-6 rounded max-w-sm w-full mx-4 space-y-3" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <h2 className="font-bold text-lg">New Goal</h2>
        <select value={metric} onChange={(e) => setMetric(e.target.value)}
          className="w-full px-3 py-2 rounded" style={{ background: "var(--paper-accent)" }}>
          {goalable.map((f) => <option key={f.goalEnum} value={f.goalEnum}>{f.label}</option>)}
        </select>
        <label className="flex justify-between items-center">
          Target value:
          <input type="number" step="0.1" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))}
            className="px-2 py-1 w-28 rounded" style={{ background: "var(--paper-accent)" }} />
        </label>
        <label className="flex justify-between items-center">
          Target date:
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
            className="px-2 py-1 rounded" style={{ background: "var(--paper-accent)" }} />
        </label>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded text-xs uppercase" style={{ background: "var(--paper-accent)", color: "var(--ink-soft)" }}>Cancel</button>
          <button onClick={save} className="px-3 py-2 rounded text-xs uppercase font-bold" style={{ background: "var(--accent)", color: "#f4ecd8" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
