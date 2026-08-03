import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { activityLogs } from './db/schema';

/** Who wrote the day's figure — the Shortcut, or the field on Today. */
export type ActivitySource = 'shortcut' | 'manual';
export const ACTIVITY_SOURCES: ActivitySource[] = ['shortcut', 'manual'];

/* A day of nothing but movement tops out well under this; anything above it
   is a units mix-up (kJ posted as kcal) rather than a real day. */
const MAX_ACTIVE_KCAL = 10_000;

export function setActiveEnergy(
  db: Db,
  userId: number,
  entry: { date: string; activeKcal: number; source: ActivitySource },
  now: Date = new Date()
): void {
  if (!Number.isFinite(entry.activeKcal) || entry.activeKcal < 0) {
    throw new Error('activeKcal must be a non-negative number');
  }
  if (entry.activeKcal > MAX_ACTIVE_KCAL) {
    throw new Error(`activeKcal above ${MAX_ACTIVE_KCAL} — check the units`);
  }
  if (!ACTIVITY_SOURCES.includes(entry.source)) {
    throw new Error(`Unknown activity source ${entry.source}`);
  }

  const activeKcal = Math.round(entry.activeKcal);
  const loggedAt = now.toISOString();

  // The Shortcut re-posts a growing daily total, so a repeat write for the
  // same day has to overwrite rather than accumulate.
  db.insert(activityLogs)
    .values({ userId, date: entry.date, activeKcal, source: entry.source, loggedAt })
    .onConflictDoUpdate({
      target: [activityLogs.userId, activityLogs.date],
      set: { activeKcal, source: entry.source, loggedAt }
    })
    .run();
}

export function activeEnergyForDate(
  db: Db,
  userId: number,
  date: string
): { activeKcal: number; source: string; loggedAt: string } | null {
  const [row] = db
    .select({
      activeKcal: activityLogs.activeKcal,
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
    .select({ date: activityLogs.date, activeKcal: activityLogs.activeKcal })
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(asc(activityLogs.date))
    .all();
}
