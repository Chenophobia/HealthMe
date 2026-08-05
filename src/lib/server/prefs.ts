import { eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { users } from './db/schema';
import { normalizeTodayOrder, type TodayCard } from '$lib/today-cards';

/*
 * UI preferences. On the user row like the body profile, but kept out of
 * profile.ts — that file is body facts feeding the energy math, and this is
 * how one page likes to be arranged.
 */

export function getTodayOrder(db: Db, userId: number): TodayCard[] {
  const [row] = db
    .select({ todayOrder: users.todayOrder })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all();
  return normalizeTodayOrder(row?.todayOrder ?? null);
}

/** Stores the normalized form, so garbage never lands in the row. */
export function setTodayOrder(db: Db, userId: number, order: string): void {
  db.update(users)
    .set({ todayOrder: normalizeTodayOrder(order).join(',') })
    .where(eq(users.id, userId))
    .run();
}
