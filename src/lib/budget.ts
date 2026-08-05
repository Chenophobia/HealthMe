/*
 * The Lose It!-style day budget: one number, Remaining, where earned
 * exercise calories *raise* the day's allowance.
 *
 *   Remaining = Budget + Earned − Food
 *
 * Earned is not "today's active energy". The budget already assumed a
 * typical day's movement (see `goalIntake` planning against `typicalActive`
 * in energy.ts), so crediting every active kcal would count that movement
 * twice. Instead, Lose It!'s baseline trick: only burn *above* what the
 * budget assumed earns anything, and a quiet day earns zero rather than
 * clawing calories back.
 *
 *   baseline = resting + typical active     (what the budget assumed)
 *   burn     = resting + today's active     (what actually happened)
 *   earned   = max(0, burn − baseline)
 *
 * Resting is the Watch's Basal Energy when it arrived, else the BMR — and
 * when neither exists it cancels out of both sides, so above-typical
 * activity still earns.
 */

export type EarnInputs = {
  /** Resolved BMR for the day. Null until a weigh-in/profile provides one. */
  bmrKcal: number | null;
  /** The Watch's Resting (Basal) Energy for the day. Null when not sent. */
  basalKcal: number | null;
  /** The day's Active Energy. Null when nothing arrived. */
  activeKcal: number | null;
  /** The recent-average activity the budget was planned against. */
  typicalActiveKcal: number | null;
};

export type EarnedEnergy = {
  /** Whole kcal, never negative. */
  earnedKcal: number;
  /** Resting figure used for today's burn: basal, else BMR, else unknown. */
  restingKcal: number | null;
  restingSource: 'watch' | 'bmr' | null;
  /** 0 when nothing arrived — `hasActive` says which. */
  activeKcal: number;
  hasActive: boolean;
  /** resting + active. Null when resting is unknowable. */
  todayBurnKcal: number | null;
  /** resting + typical active. Null when resting is unknowable. */
  baselineKcal: number | null;
  typicalActiveKcal: number;
};

function clean(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

export function earnedEnergy(input: EarnInputs): EarnedEnergy {
  const bmr = clean(input.bmrKcal);
  const basal = clean(input.basalKcal);
  const active = clean(input.activeKcal);
  const typical = clean(input.typicalActiveKcal) ?? 0;

  const resting = basal ?? bmr;
  const restingSource: 'watch' | 'bmr' | null =
    basal !== null ? 'watch' : bmr !== null ? 'bmr' : null;

  // The baseline's resting term is the BMR (that is what the budget was
  // planned from); today's is the Watch's word when it arrived. With neither
  // known the term is identical on both sides and drops out.
  const restingToday = resting ?? 0;
  const restingBaseline = bmr ?? basal ?? 0;

  const burn = restingToday + (active ?? 0);
  const baseline = restingBaseline + typical;

  return {
    earnedKcal: Math.max(0, Math.round(burn - baseline)),
    restingKcal: resting === null ? null : Math.round(resting),
    restingSource,
    activeKcal: Math.round(active ?? 0),
    hasActive: active !== null,
    todayBurnKcal: resting === null ? null : Math.round(burn),
    baselineKcal: resting === null ? null : Math.round(baseline),
    typicalActiveKcal: Math.round(typical)
  };
}

export type DayBudget = {
  budgetKcal: number;
  earnedKcal: number;
  /** budget + earned — what the ring fills against. */
  allowanceKcal: number;
  eatenKcal: number;
  /** Negative once the allowance is breached. */
  remainingKcal: number;
};

export function dayBudget(input: {
  budgetKcal: number;
  earnedKcal: number;
  eatenKcal: number;
}): DayBudget {
  const budgetKcal = Math.round(input.budgetKcal);
  const earnedKcal = Math.max(0, Math.round(input.earnedKcal));
  const eatenKcal = Math.max(0, Math.round(input.eatenKcal));
  const allowanceKcal = budgetKcal + earnedKcal;
  return {
    budgetKcal,
    earnedKcal,
    allowanceKcal,
    eatenKcal,
    remainingKcal: allowanceKcal - eatenKcal
  };
}
