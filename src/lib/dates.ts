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
