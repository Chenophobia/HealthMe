import { eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { mealLogs } from './db/schema';
import { shiftDate } from '../dates';

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
