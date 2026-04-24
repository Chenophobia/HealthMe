"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoalForm } from "@/components/goal-form";
import { METRIC_FIELDS } from "@/lib/metric-fields";
import { goalStatus } from "@/lib/goal-delta";

interface Goal { id: number; metric: string; targetValue: number; targetDate: string; active: boolean; createdAt: string; }

const DECREASE_METRICS = new Set(["WEIGHT_KG", "BODY_FAT_PCT", "BMI", "VISCERAL_FAT"]);

export function GoalsClient({ goals, projections }: { goals: Goal[]; projections: Record<string, number> }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const archive = async (id: number) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const active = goals.filter((g) => g.active);
  const history = goals.filter((g) => !g.active);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Goals</h1>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded text-xs uppercase font-bold"
          style={{ background: "var(--accent)", color: "#f4ecd8" }}>+ New Goal</button>
      </div>
      <section className="space-y-2">
        <h2 className="uppercase tracking-widest text-xs" style={{ color: "var(--ink-faded)" }}>Active</h2>
        {active.map((g) => {
          const field = METRIC_FIELDS.find((f) => f.goalEnum === g.metric);
          const proj = projections[g.id];
          const direction = DECREASE_METRICS.has(g.metric) ? "decrease" as const : "increase" as const;
          const status = proj != null ? goalStatus({
            direction,
            currentValue: proj,
            targetValue: g.targetValue,
            projectedValue: proj,
            targetDate: new Date(g.targetDate),
            today: new Date(),
          }) : null;
          return (
            <div key={g.id} className="p-4 rounded flex justify-between items-center" style={{ background: "var(--paper-accent)" }}>
              <div>
                <div className="font-bold">{field?.label} → {g.targetValue} {field?.unit}</div>
                <div className="text-xs" style={{ color: "var(--ink-soft)" }}>by {new Date(g.targetDate).toLocaleDateString()}</div>
                {status && (
                  <div className="text-xs mt-1" style={{ color: status.onTrack ? "var(--accent-2)" : "var(--accent)" }}>
                    Projected {proj?.toFixed(2)} · {status.onTrack ? "on track" : `off by ${status.delta.toFixed(2)}`}
                  </div>
                )}
              </div>
              <button onClick={() => archive(g.id)} style={{ color: "var(--accent)" }}>archive</button>
            </div>
          );
        })}
        {active.length === 0 && <p style={{ color: "var(--ink-faded)" }}>No active goals.</p>}
      </section>
      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="uppercase tracking-widest text-xs" style={{ color: "var(--ink-faded)" }}>History</h2>
          {history.map((g) => {
            const field = METRIC_FIELDS.find((f) => f.goalEnum === g.metric);
            return (
              <div key={g.id} className="p-3 rounded text-sm" style={{ background: "var(--paper-accent)", opacity: 0.7 }}>
                {field?.label} → {g.targetValue} {field?.unit} by {new Date(g.targetDate).toLocaleDateString()}
              </div>
            );
          })}
        </section>
      )}
      {showForm && <GoalForm onClose={() => { setShowForm(false); router.refresh(); }} />}
    </div>
  );
}
