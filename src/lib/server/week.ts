import type { Db } from './db/connect';
import { listMetrics } from './metrics';
import { listActiveEnergy } from './activity';
import { dailyKcalTotals } from './meals';
import { getProfile } from './profile';
import { resolveBmr, typicalActive } from '$lib/energy';
import { earnedEnergy, dayBudget, type DayBudget, type EarnedEnergy } from '$lib/budget';
import { shiftDate } from '$lib/dates';

/*
 * The Today page's budget arithmetic, per day.
 *
 * Each day's earn is judged against the activity *before* it — a day's own
 * burn must not raise its own baseline, or a big day would part-cancel
 * itself. The budget figure is today's target for every day shown: the app
 * doesn't keep a history of what the target was, and a week bar is a shape
 * to read, not a ledger to audit.
 */

export type WeekDay = DayBudget & { date: string; logged: boolean };

type Deps = {
  metrics: ReturnType<typeof listMetrics>;
  profile: ReturnType<typeof getProfile>;
  activity: ReturnType<typeof listActiveEnergy>;
};

function loadDeps(db: Db, userId: number): Deps {
  return {
    metrics: listMetrics(db, userId),
    profile: getProfile(db, userId),
    activity: listActiveEnergy(db, userId)
  };
}

function earnedOn(deps: Deps, date: string): EarnedEnergy {
  const day = deps.activity.find((a) => a.date === date) ?? null;
  return earnedEnergy({
    bmrKcal: resolveBmr(date, deps.metrics, deps.profile)?.kcal ?? null,
    basalKcal: day?.basalKcal ?? null,
    activeKcal: day?.activeKcal ?? null,
    typicalActiveKcal: typicalActive(deps.activity.filter((a) => a.date < date))
  });
}

/** The burn-vs-baseline breakdown behind one day's earned calories. */
export function dayEnergyReadout(db: Db, userId: number, date: string): EarnedEnergy {
  return earnedOn(loadDeps(db, userId), date);
}

/** The 7 days ending on `endDate`, oldest first. */
export function weekReadout(
  db: Db,
  userId: number,
  endDate: string,
  budgetKcal: number
): WeekDay[] {
  const deps = loadDeps(db, userId);
  const eatenByDate = new Map(dailyKcalTotals(db, userId).map((d) => [d.date, d.kcal]));

  return Array.from({ length: 7 }, (_, i) => shiftDate(endDate, i - 6)).map((date) => {
    const eatenKcal = eatenByDate.get(date) ?? 0;
    return {
      date,
      logged: eatenKcal > 0,
      ...dayBudget({ budgetKcal, earnedKcal: earnedOn(deps, date).earnedKcal, eatenKcal })
    };
  });
}
