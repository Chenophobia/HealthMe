export function normalizeToLocalMidnight(isoDate: string, tz: string): Date {
  const probe = new Date(`${isoDate}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(probe);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const wallAsUtc = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second")),
  );
  const offsetMs = wallAsUtc - probe.getTime();
  return new Date(probe.getTime() - offsetMs);
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
