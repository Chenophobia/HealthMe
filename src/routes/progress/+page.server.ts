import { db } from '$lib/server/db';
import { listMetrics } from '$lib/server/metrics';
import { mealStreak, sessionsThisWeek } from '$lib/server/streaks';
import { todayLocal } from '$lib/dates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  return {
    metrics: listMetrics(db, locals.user!.id),
    streak: mealStreak(db, locals.user!.id, date),
    week: sessionsThisWeek(db, locals.user!.id, date)
  };
};
