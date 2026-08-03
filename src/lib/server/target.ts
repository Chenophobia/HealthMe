import type { Db } from './db/connect';
import { listMetrics } from './metrics';
import { listActiveEnergy } from './activity';
import { getProfile } from './profile';
import { KCAL_TARGET, KCAL_FLOOR } from '$lib/targets';
import {
  resolveBmr,
  goalPace,
  typicalActive,
  goalIntake,
  type GoalPace,
  type GoalIntake
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
  /** What the gauges fill against. Falls back to the program's fixed anchor. */
  kcalTarget: number;
};

export function dailyTarget(db: Db, userId: number, today: string): DailyTarget {
  const metrics = listMetrics(db, userId);
  const profile = getProfile(db, userId);
  const latest = metrics.at(-1) ?? null;

  const pace =
    profile.goalWeightKg !== null && profile.goalDate !== null && latest
      ? goalPace({
          currentKg: latest.weightKg,
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

  return { pace, intake, kcalTarget: intake?.intakeKcal ?? KCAL_TARGET };
}
