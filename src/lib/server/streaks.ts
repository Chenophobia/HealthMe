import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { mealLogs, workoutSessions } from './db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

function shiftDate(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Consecutive days with >= 1 meal log, ending at `today` — or at yesterday,
 * so an unbroken run doesn't read as 0 before breakfast is logged.
 */
export function mealStreak(db: Db, userId: number, today: string): number {
  const dates = new Set(
    db
      .selectDistinct({ date: mealLogs.date })
      .from(mealLogs)
      .where(eq(mealLogs.userId, userId))
      .all()
      .map((r) => r.date)
  );
  let anchor = today;
  if (!dates.has(anchor)) anchor = shiftDate(today, -1);
  let streak = 0;
  while (dates.has(anchor)) {
    streak += 1;
    anchor = shiftDate(anchor, -1);
  }
  return streak;
}

/** Monday-anchored week containing `today`. */
export function weekBounds(today: string): { monday: string; sunday: string } {
  const d = new Date(`${today}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  const monday = shiftDate(today, -back);
  return { monday, sunday: shiftDate(monday, 6) };
}

export function sessionsThisWeek(
  db: Db,
  userId: number,
  today: string
): { done: number; target: 3 } {
  const { monday, sunday } = weekBounds(today);
  const [row] = db
    .select({ n: sql<number>`count(*)` })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.date, monday),
        lte(workoutSessions.date, sunday)
      )
    )
    .all();
  return { done: row?.n ?? 0, target: 3 };
}
