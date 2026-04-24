"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { METRIC_FIELDS, type MetricKey } from "@/lib/metric-fields";
import { MetricChart } from "@/components/metric-chart";
import { linearRegression, project } from "@/lib/regression";

const RANGES = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "365d", days: 365 },
  { key: "all", days: null as number | null },
];

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

export function MetricsClient({ metrics, goals }: { metrics: SerMetric[]; goals: SerGoal[] }) {
  const [metricKey, setMetricKey] = useState<MetricKey>("weightKg");
  const [rangeKey, setRangeKey] = useState("30d");
  const [showProjection, setShowProjection] = useState(true);

  const days = RANGES.find((r) => r.key === rangeKey)?.days;
  const cutoff = days == null ? 0 : Date.now() - days * 86400_000;

  const filtered = useMemo(
    () => metrics.filter((m) => new Date(m.capturedAt).getTime() >= cutoff),
    [metrics, cutoff],
  );

  const field = METRIC_FIELDS.find((f) => f.key === metricKey)!;
  const points = filtered
    .map((m) => ({
      date: new Date(m.capturedAt).toLocaleDateString(),
      x: new Date(m.capturedAt).getTime() / 86400_000,
      y: m[metricKey] as number | null,
    }))
    .filter((p): p is { date: string; x: number; y: number } => p.y != null);

  const data = points.map((p) => ({ date: p.date, value: p.y }));
  const reg = showProjection ? linearRegression(points.map((p) => ({ x: p.x, y: p.y }))) : null;
  const projection = reg && points.length > 0
    ? [0, 7, 14, 21, 30].map((d) => {
        const x = points[points.length - 1].x + d;
        return { date: new Date(x * 86400_000).toLocaleDateString(), value: project(reg, x) };
      })
    : undefined;
  const goal = goals.find((g) => g.metric === field.goalEnum);

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value as MetricKey)}
          className="px-3 py-2 rounded"
          style={{ background: "var(--paper-accent)", color: "var(--ink)", borderColor: "var(--divider)" }}
        >
          {METRIC_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className="px-3 py-1 rounded text-xs uppercase tracking-wider"
              style={{
                background: rangeKey === r.key ? "var(--accent)" : "var(--paper-accent)",
                color: rangeKey === r.key ? "#f4ecd8" : "var(--ink-soft)",
              }}
            >
              {r.key}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm ml-auto">
          <input type="checkbox" checked={showProjection} onChange={(e) => setShowProjection(e.target.checked)} />
          Show projection
        </label>
        <Link
          href="/metrics/capture"
          className="px-3 py-2 rounded text-xs uppercase font-bold"
          style={{ background: "var(--accent)", color: "#f4ecd8" }}
        >
          + Capture
        </Link>
      </div>
      <MetricChart data={data} projection={projection} goalY={goal?.targetValue} />
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--ink-faded)" }}>
            <th className="text-left py-2">Date</th>
            <th className="text-right">Value</th>
            <th className="text-left pl-4">Source</th>
          </tr>
        </thead>
        <tbody>
          {points.slice().reverse().map((p, i) => (
            <tr key={`${p.date}-${i}`} style={{ borderTop: "1px solid var(--divider)" }}>
              <td className="py-2">{p.date}</td>
              <td className="text-right">{p.y.toFixed(2)} {field.unit}</td>
              <td className="pl-4 opacity-70">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
