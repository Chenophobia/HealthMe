"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  data: { date: string; value: number }[];
  projection?: { date: string; value: number }[];
  goalY?: number;
}

export function MetricChart({ data, projection, goalY }: Props) {
  const combined = [
    ...data.map((d) => ({ ...d, kind: "history" as const })),
    ...(projection ?? []).map((d) => ({ ...d, kind: "projection" as const })),
  ];
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <LineChart data={combined}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--divider)" />
          <XAxis dataKey="date" stroke="var(--ink-faded)" />
          <YAxis stroke="var(--ink-faded)" />
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
