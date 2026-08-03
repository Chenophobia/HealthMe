import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { bodyMetrics } from './db/schema';

export function addBodyMetric(
  db: Db,
  userId: number,
  entry: {
    date: string;
    weightKg: number;
    bodyFatPct?: number | null;
    bmrKcal?: number | null;
  },
  now: Date = new Date()
): void {
  if (!Number.isFinite(entry.weightKg) || entry.weightKg <= 0 || entry.weightKg > 500) {
    throw new Error('weightKg out of range');
  }
  const bf = entry.bodyFatPct ?? null;
  if (bf !== null && (!Number.isFinite(bf) || bf <= 0 || bf >= 100)) {
    throw new Error('bodyFatPct out of range');
  }
  // Wide bounds on purpose — this only has to catch a slipped decimal or a
  // kJ/kcal mix-up, not adjudicate a plausible metabolism.
  const bmr = entry.bmrKcal ?? null;
  if (bmr !== null && (!Number.isFinite(bmr) || bmr < 500 || bmr > 5000)) {
    throw new Error('bmrKcal out of range');
  }
  // One entry per day: a re-weigh replaces the earlier one.
  db.delete(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.date, entry.date)))
    .run();
  db.insert(bodyMetrics)
    .values({
      userId,
      date: entry.date,
      weightKg: entry.weightKg,
      bodyFatPct: bf,
      bmrKcal: bmr === null ? null : Math.round(bmr),
      loggedAt: now.toISOString()
    })
    .run();
}

export function listMetrics(db: Db, userId: number) {
  return db
    .select({
      date: bodyMetrics.date,
      weightKg: bodyMetrics.weightKg,
      bodyFatPct: bodyMetrics.bodyFatPct,
      bmrKcal: bodyMetrics.bmrKcal
    })
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(asc(bodyMetrics.date))
    .all();
}
