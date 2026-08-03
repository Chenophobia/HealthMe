/** YYYY-MM-DD in the process's local timezone (container sets TZ from .env). */
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO weekday name used for the training schedule. */
export function weekdayOf(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
}

export type SessionType = 'push' | 'pull' | 'legs';

/** Mon=Push, Wed=Pull, Fri=Legs — the program's weekly schedule. */
export function scheduledSessionFor(date: string): SessionType | null {
  const dow = new Date(`${date}T12:00:00`).getDay();
  return dow === 1 ? 'push' : dow === 3 ? 'pull' : dow === 5 ? 'legs' : null;
}

/** Strict YYYY-MM-DD: right shape AND a real calendar date (2026-02-30 fails). */
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Whole days from `from` to `to`. Negative when `to` is the earlier one. */
export function daysBetween(from: string, to: string): number | null {
  if (!isValidDate(from) || !isValidDate(to)) return null;
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** `date` shifted by `days` calendar days (UTC arithmetic on the date-only value). */
export function shiftDate(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}
