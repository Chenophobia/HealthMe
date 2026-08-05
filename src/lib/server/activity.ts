import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { activityLogs } from './db/schema';

/** Who wrote the day's figure — the Shortcut, or the field on Today. */
export type ActivitySource = 'shortcut' | 'manual';
export const ACTIVITY_SOURCES: ActivitySource[] = ['shortcut', 'manual'];

/* A day of nothing but movement tops out well under this; anything above it
   is a units mix-up (kJ posted as kcal) rather than a real day. Resting burn
   lives under the same roof — a 10,000 kcal BMR isn't a person either. */
const MAX_KCAL = 10_000;

function cleanKcal(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  if (value > MAX_KCAL) {
    throw new Error(`${label} above ${MAX_KCAL} — check the units`);
  }
  return Math.round(value);
}

export function setActiveEnergy(
  db: Db,
  userId: number,
  entry: { date: string; activeKcal: number; basalKcal?: number | null; source: ActivitySource },
  now: Date = new Date()
): void {
  if (!ACTIVITY_SOURCES.includes(entry.source)) {
    throw new Error(`Unknown activity source ${entry.source}`);
  }

  const activeKcal = cleanKcal(entry.activeKcal, 'activeKcal');
  // Absent means absent: a write without a resting figure clears any stale
  // one, because each write is the whole day as the sender now knows it.
  const basalKcal =
    entry.basalKcal === undefined || entry.basalKcal === null
      ? null
      : cleanKcal(entry.basalKcal, 'basalKcal');
  const loggedAt = now.toISOString();

  // The Shortcut re-posts a growing daily total, so a repeat write for the
  // same day has to overwrite rather than accumulate.
  db.insert(activityLogs)
    .values({ userId, date: entry.date, activeKcal, basalKcal, source: entry.source, loggedAt })
    .onConflictDoUpdate({
      target: [activityLogs.userId, activityLogs.date],
      set: { activeKcal, basalKcal, source: entry.source, loggedAt }
    })
    .run();
}

export function activeEnergyForDate(
  db: Db,
  userId: number,
  date: string
): { activeKcal: number; basalKcal: number | null; source: string; loggedAt: string } | null {
  const [row] = db
    .select({
      activeKcal: activityLogs.activeKcal,
      basalKcal: activityLogs.basalKcal,
      source: activityLogs.source,
      loggedAt: activityLogs.loggedAt
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.date, date)))
    .limit(1)
    .all();
  return row ?? null;
}

export function listActiveEnergy(db: Db, userId: number) {
  return db
    .select({
      date: activityLogs.date,
      activeKcal: activityLogs.activeKcal,
      basalKcal: activityLogs.basalKcal
    })
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(asc(activityLogs.date))
    .all();
}
