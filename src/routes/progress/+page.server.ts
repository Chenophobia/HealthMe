import { db } from '$lib/server/db';
import { listMetrics } from '$lib/server/metrics';
import { listActiveEnergy } from '$lib/server/activity';
import { dailyKcalTotals } from '$lib/server/meals';
import { mealStreak } from '$lib/server/streaks';
import { todayLocal } from '$lib/dates';
import { bmrOnOrBefore, deficitSummary, energyBalance, weightChangeBetween } from '$lib/energy';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  const userId = locals.user!.id;
  const metrics = listMetrics(db, userId);

  const activeByDate = new Map(listActiveEnergy(db, userId).map((a) => [a.date, a.activeKcal]));

  /*
   * Only days that actually have food logged count. A day with no meals isn't
   * a day you ate nothing — it's a day you didn't log, and counting it would
   * book a ~2,000 kcal deficit that never happened.
   */
  const days = dailyKcalTotals(db, userId)
    .filter((d) => d.kcal > 0)
    .map((d) => ({
      date: d.date,
      deficitKcal: energyBalance({
        bmrKcal: bmrOnOrBefore(metrics, d.date),
        activeKcal: activeByDate.get(d.date) ?? null,
        eatenKcal: d.kcal
      }).deficitKcal
    }));

  const complete = days.filter((d) => d.deficitKcal !== null);
  const summary = deficitSummary(days);
  const window =
    complete.length > 0 ? { from: complete[0].date, to: complete[complete.length - 1].date } : null;

  return {
    metrics,
    streak: mealStreak(db, userId, date),
    deficit: summary,
    // What the scale did over the same span — the check on the estimate.
    actualChangeKg: window ? weightChangeBetween(metrics, window.from, window.to) : null
  };
};
