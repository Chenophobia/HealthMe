import { db } from '$lib/server/db';
import { listMetrics } from '$lib/server/metrics';
import { mealStreak } from '$lib/server/streaks';
import { deficitSeries } from '$lib/server/target';
import { todayLocal } from '$lib/dates';
import { deficitSummary, weightChangeBetween } from '$lib/energy';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  const userId = locals.user!.id;
  const metrics = listMetrics(db, userId);

  // Same series Today paces against — built once, in one place.
  const days = deficitSeries(db, userId);

  const complete = days.filter((d) => d.deficitKcal !== null);
  const summary = deficitSummary(days);
  const window =
    complete.length > 0 ? { from: complete[0].date, to: complete[complete.length - 1].date } : null;

  return {
    metrics,
    streak: mealStreak(db, userId, date),
    deficit: summary,
    // The per-day series behind the average, for the chart.
    deficitDays: days.slice(-60),
    // What the scale did over the same span — the check on the estimate.
    actualChangeKg: window ? weightChangeBetween(metrics, window.from, window.to) : null
  };
};
