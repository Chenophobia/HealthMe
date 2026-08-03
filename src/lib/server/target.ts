import type { Db } from './db/connect';
import { listMetrics } from './metrics';
import { listActiveEnergy } from './activity';
import { dailyKcalTotals } from './meals';
import { getProfile } from './profile';
import { KCAL_TARGET, KCAL_FLOOR } from '$lib/targets';
import { rollingAverage } from '$lib/rolling';
import {
  resolveBmr,
  energyBalance,
  goalPace,
  typicalActive,
  goalIntake,
  carriedShortfall,
  type DeficitDay,
  type GoalPace,
  type GoalIntake,
  type Carry
} from '$lib/energy';

/*
 * The day's calorie target, in one place.
 *
 * Today and Meals both show it, and computing it twice guarantees they
 * eventually disagree about how much you're supposed to eat — which is the
 * one number in the app that has to be the same everywhere.
 */
export type DailyTarget = {
  /** Null when no goal is set, already met, or its date has passed. */
  pace: GoalPace | null;
  /** Null when the goal can't be costed yet — no weigh-in or no body profile. */
  intake: GoalIntake | null;
  /** Behind/ahead over the days the scale hasn't absorbed yet. Null if none. */
  carry: Carry | null;
  /** What the gauges fill against. Falls back to the program's fixed anchor. */
  kcalTarget: number;
};

/**
 * The per-day energy balance, oldest first.
 *
 * Only days with food logged count. A day with no meals isn't a day you ate
 * nothing — it's a day you didn't log, and counting it would book a ~2,000
 * kcal deficit that never happened.
 */
export function deficitSeries(db: Db, userId: number): DeficitDay[] {
  const metrics = listMetrics(db, userId);
  const profile = getProfile(db, userId);
  const activeByDate = new Map(listActiveEnergy(db, userId).map((a) => [a.date, a.activeKcal]));

  return dailyKcalTotals(db, userId)
    .filter((d) => d.kcal > 0)
    .map((d) => ({
      date: d.date,
      deficitKcal: energyBalance({
        bmrKcal: resolveBmr(d.date, metrics, profile)?.kcal ?? null,
        activeKcal: activeByDate.get(d.date) ?? null,
        eatenKcal: d.kcal
      }).deficitKcal
    }));
}

export function dailyTarget(db: Db, userId: number, today: string): DailyTarget {
  const metrics = listMetrics(db, userId);
  const profile = getProfile(db, userId);
  const latest = metrics.at(-1) ?? null;

  /*
   * Paced from the seven-day average, not the last reading. A single weigh-in
   * carries 1–2 kg of water noise, and at ~35 days left that swing alone moves
   * the required deficit by more than 300 kcal/day — the target would lurch
   * around for reasons that have nothing to do with progress.
   */
  const smoothed = rollingAverage(
    metrics.map((m) => ({ date: m.date, value: m.weightKg })),
    7
  );
  const currentKg = smoothed.at(-1)?.value ?? latest?.weightKg ?? null;

  const pace =
    profile.goalWeightKg !== null && profile.goalDate !== null && currentKg !== null
      ? goalPace({
          currentKg,
          goalKg: profile.goalWeightKg,
          today,
          goalDate: profile.goalDate
        })
      : null;

  /*
   * Planned against an *average* of recent activity rather than today's
   * running total, so the number is stable enough to plan meals against and
   * doesn't climb as the day's movement accumulates.
   */
  const intake =
    pace && !pace.reached && !pace.expired
      ? goalIntake({
          bmrKcal: resolveBmr(today, metrics, profile)?.kcal ?? null,
          typicalActiveKcal: typicalActive(listActiveEnergy(db, userId)),
          requiredDeficitKcal: pace.perDayKcal,
          floorKcal: KCAL_FLOOR
        })
      : null;

  /*
   * The days the scale hasn't priced in yet, ending before today because
   * today isn't over.
   *
   * The weigh-in day itself is *included*: you weigh in the morning, so that
   * reading is the outcome of the days before it and says nothing about what
   * you then ate. Excluding it would drop the most recent full day — the one
   * you're most likely asking about — from the carry entirely.
   */
  const carry =
    pace && !pace.reached && !pace.expired
      ? carriedShortfall(
          pace.perDayKcal,
          deficitSeries(db, userId).filter(
            (d) => d.date < today && (latest === null || d.date >= latest.date)
          )
        )
      : null;

  return { pace, intake, carry, kcalTarget: intake?.intakeKcal ?? KCAL_TARGET };
}
