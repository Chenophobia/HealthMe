export type DatedValue = { date: string; value: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trailing-window average per point (window includes the point's own day). */
export function rollingAverage(points: DatedValue[], windowDays = 7): DatedValue[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const end = new Date(`${p.date}T00:00:00Z`).getTime();
    const start = end - (windowDays - 1) * DAY_MS;
    const inWindow = sorted
      .slice(0, i + 1)
      .filter((q) => new Date(`${q.date}T00:00:00Z`).getTime() >= start);
    const mean = inWindow.reduce((s, q) => s + q.value, 0) / inWindow.length;
    return { date: p.date, value: mean };
  });
}
