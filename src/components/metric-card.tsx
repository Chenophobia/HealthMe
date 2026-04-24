import { Sparkline } from "@/components/sparkline";

interface Props {
  label: string;
  value: number | null;
  unit: string;
  weekDelta?: number | null;
  deltaGood?: "up" | "down";
  sparkPoints: { x: number; y: number }[];
  sparkProjection?: { x: number; y: number }[];
  goalY?: number;
}

export function MetricCard({ label, value, unit, weekDelta, deltaGood, sparkPoints, sparkProjection, goalY }: Props) {
  const deltaSign = weekDelta == null ? "" : weekDelta > 0 ? "+" : "";
  const deltaIsGood =
    weekDelta == null || deltaGood == null
      ? false
      : (deltaGood === "up" && weekDelta > 0) || (deltaGood === "down" && weekDelta < 0);
  return (
    <div className="p-4 rounded" style={{ background: "var(--paper-accent)" }}>
      <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: "var(--ink-faded)" }}>
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight">
        {value?.toFixed(1) ?? "—"}
        <span className="text-sm ml-1" style={{ color: "var(--ink-soft)" }}>
          {unit}
        </span>
      </div>
      {weekDelta != null && (
        <div className="text-xs mt-1 font-bold" style={{ color: deltaIsGood ? "var(--accent-2)" : "var(--accent)" }}>
          {deltaSign}
          {weekDelta.toFixed(1)} this week
        </div>
      )}
      <Sparkline points={sparkPoints} projection={sparkProjection} goalY={goalY} />
    </div>
  );
}
