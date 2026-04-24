"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  data: { date: string; value: number }[];
  projection?: { date: string; value: number }[];
  goalY?: number;
}

/**
 * Compute [min, max] for the Y axis with 10% padding on each side
 * and include the goal line if present. Keeps the viewport zoomed into
 * the actual data range instead of starting at 0.
 */
function computeDomain(
  values: number[],
  goalY?: number,
): [number, number] | ["auto", "auto"] {
  const all = [...values];
  if (goalY != null) all.push(goalY);
  if (all.length === 0) return ["auto", "auto"];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const pad = span * 0.1;
  return [+(min - pad).toFixed(2), +(max + pad).toFixed(2)];
}

export function MetricChart({ data, projection, goalY }: Props) {
  const combined = [
    ...data.map((d) => ({ ...d, kind: "history" as const })),
    ...(projection ?? []).map((d) => ({ ...d, kind: "projection" as const })),
  ];
  const allValues = combined.map((r) => r.value).filter((v): v is number => typeof v === "number");
  const domain = computeDomain(allValues, goalY);
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <LineChart data={combined}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" />
          <XAxis dataKey="date" stroke="var(--ink-faded)" />
          <YAxis stroke="var(--ink-faded)" domain={domain} allowDataOverflow={false} />
          <Tooltip contentStyle={{ background: "var(--paper-accent)", borderColor: "var(--divider)" }} />
          <Line
            type="monotone"
            dataKey={(row: { kind: string; value: number }) => (row.kind === "history" ? row.value : null)}
            name="History"
            stroke="var(--ink)"
            strokeWidth={2}
            dot={{ r: 2 }}
            filter="url(#rough)"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey={(row: { kind: string; value: number }) => (row.kind === "projection" ? row.value : null)}
            name="Projection"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            connectNulls={false}
          />
          {goalY != null && <ReferenceLine y={goalY} stroke="var(--accent-2)" strokeDasharray="2 4" label="Goal" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
