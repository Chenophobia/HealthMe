interface SparkProps {
  points: { x: number; y: number }[];
  projection?: { x: number; y: number }[];
  goalY?: number;
  yMin?: number;
  yMax?: number;
}

export function Sparkline({ points, projection, goalY, yMin, yMax }: SparkProps) {
  if (points.length === 0) {
    return <div className="h-11 flex items-center justify-center text-xs opacity-50">no data</div>;
  }
  const xs = points.map((p) => p.x).concat(projection?.map((p) => p.x) ?? []);
  const ys = points.map((p) => p.y).concat(projection?.map((p) => p.y) ?? []);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yLo = yMin ?? Math.min(...ys, goalY ?? Infinity);
  const yHi = yMax ?? Math.max(...ys, goalY ?? -Infinity);
  const sx = (x: number) => ((x - xMin) / (xMax - xMin || 1)) * 200;
  const sy = (y: number) => 44 - ((y - yLo) / (yHi - yLo || 1)) * 44;
  const path = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  return (
    <svg className="w-full h-11 mt-2" viewBox="0 0 200 44" preserveAspectRatio="none">
      <path
        d={path(points)}
        stroke="var(--ink)"
        strokeWidth="1.8"
        fill="none"
        filter="url(#rough)"
        strokeLinecap="round"
      />
      {projection && projection.length > 0 && (
        <path
          d={path(projection)}
          stroke="var(--accent)"
          strokeWidth="1.8"
          fill="none"
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}
      {goalY != null && (
        <line
          x1="0"
          x2="200"
          y1={sy(goalY)}
          y2={sy(goalY)}
          stroke="var(--accent-2)"
          strokeDasharray="2 4"
          opacity={0.6}
        />
      )}
    </svg>
  );
}
