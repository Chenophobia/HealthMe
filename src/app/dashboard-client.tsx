"use client";
import { useState } from "react";
import Link from "next/link";
import { CalorieBar } from "@/components/calorie-bar";
import { MetricCard } from "@/components/metric-card";
import { ActivityEntry } from "@/components/activity-entry";
import { linearRegression, project } from "@/lib/regression";
import type { MetricField } from "@/lib/metric-fields";

interface SerMetric {
  id: number;
  capturedAt: string;
  [k: string]: unknown;
}
interface SerGoal {
  id: number;
  metric: string;
  targetValue: number;
  targetDate: string;
  active: boolean;
  createdAt: string;
}

interface Props {
  metrics: SerMetric[];
  primary: MetricField[];
  secondary: MetricField[];
  goals: SerGoal[];
  intake: number;
  bmr: number;
  active: number;
}

export function DashboardClient({ metrics, primary, secondary, goals, intake, bmr, active }: Props) {
  const [showProjection, setShowProjection] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const cardFor = (f: MetricField) => {
    const points = metrics
      .map((m) => ({
        x: new Date(m.capturedAt).getTime() / 86400_000,
        y: m[f.key] as number | null,
      }))
      .filter((p): p is { x: number; y: number } => p.y != null);
    const latest = points[points.length - 1]?.y ?? null;
    const weekAgo = points.find((p) => p.x >= (points[points.length - 1]?.x ?? 0) - 7);
    const weekDelta = latest != null && weekAgo?.y != null ? latest - weekAgo.y : null;
    const reg = showProjection ? linearRegression(points) : null;
    const proj = reg && points.length > 0
      ? [0, 7, 14, 21, 30].map((d) => ({
          x: points[points.length - 1].x + d,
          y: project(reg, points[points.length - 1].x + d),
        }))
      : undefined;
    const goal = goals.find((g) => g.metric === f.goalEnum);
    const deltaGood: "up" | "down" = f.key === "skeletalMuscleKg" ? "up" : "down";
    return (
      <MetricCard
        key={f.key}
        label={f.label}
        value={latest}
        unit={f.unit}
        weekDelta={weekDelta}
        deltaGood={deltaGood}
        sparkPoints={points}
        sparkProjection={proj}
        goalY={goal?.targetValue}
      />
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <CalorieBar intake={intake} bmr={bmr} active={active} />
        <Link
          href="/metrics/capture"
          className="ml-4 px-4 py-2 rounded text-xs uppercase tracking-widest font-bold"
          style={{ background: "var(--accent)", color: "#f4ecd8" }}
        >
          + Capture RENPHO
        </Link>
      </div>
      <ActivityEntry initialKcal={active} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {primary.map(cardFor)}
      </div>
      <div
        className="flex justify-between items-center px-5 py-3 rounded"
        style={{ background: "var(--paper-accent)", color: "var(--ink-soft)" }}
      >
        <span>Show trajectory (30-day projection)</span>
        <button
          onClick={() => setShowProjection((v) => !v)}
          className="w-10 h-5 rounded-full relative transition-colors"
          style={{ background: showProjection ? "var(--accent)" : "var(--divider)" }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
            style={{ background: "var(--paper)", left: showProjection ? 22 : 2 }}
          />
        </button>
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs uppercase tracking-widest font-bold pb-1.5 border-b border-dashed w-full text-left"
        style={{ color: "var(--ink-faded)", borderColor: "var(--divider)" }}
      >
        All Metrics {expanded ? "▴" : "▾"}
      </button>
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{secondary.map(cardFor)}</div>
      )}
    </div>
  );
}
