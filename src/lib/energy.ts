/*
 * Energy balance for a day.
 *
 * Two burn figures come from two different instruments and must not be added
 * to each other's territory: Renpho's BMR is resting burn, Apple Health's
 * *Active* Energy is what you spent on top of it. Total burn is the sum, and
 * the deficit is what's left after eating:
 *
 *   burned  = BMR + active
 *   deficit = burned - eaten
 *
 * A positive deficit means the day went the right way. This is deliberately
 * a readout and not a target: both inputs are estimates that err high, so
 * intake stays anchored to the program's fixed figure in `targets.ts` rather
 * than floating with them.
 */

/** Rule of thumb for the energy in a kilo of body fat. */
export const KCAL_PER_KG_FAT = 7700;

export type EnergyInputs = {
  /** Most recent BMR reading on or before the day. Null until one is logged. */
  bmrKcal: number | null;
  /** Apple Health active energy for the day. Null when nothing arrived. */
  activeKcal: number | null;
  eatenKcal: number;
};

/**
 * `unknown` — no BMR yet, so burn is unknowable.
 * `pending` — burn is known but nothing has been eaten yet, so the day's
 *   figure would just be the whole of burn. Reporting that at 8am as a
 *   2,000 kcal deficit is worse than reporting nothing.
 */
export type EnergyStatus = 'unknown' | 'pending' | 'deficit' | 'surplus';

export type EnergyBalance = {
  bmrKcal: number | null;
  activeKcal: number;
  /** Null when there is no BMR yet — burn is unknowable, not zero. */
  burnedKcal: number | null;
  eatenKcal: number;
  deficitKcal: number | null;
  /** Whether an active-energy figure actually arrived, as against defaulting to 0. */
  hasActive: boolean;
  status: EnergyStatus;
};

function clean(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function energyBalance(input: EnergyInputs): EnergyBalance {
  const bmr = clean(input.bmrKcal);
  const active = clean(input.activeKcal);
  const eaten = clean(input.eatenKcal) ?? 0;

  // Without a BMR there is no resting figure to build on, and reporting a
  // deficit off active energy alone would overstate it by well over 1,000
  // kcal. Report nothing instead.
  if (bmr === null) {
    return {
      bmrKcal: null,
      activeKcal: active ?? 0,
      burnedKcal: null,
      eatenKcal: eaten,
      deficitKcal: null,
      hasActive: active !== null,
      status: 'unknown'
    };
  }

  const burned = bmr + (active ?? 0);
  const deficit = burned - eaten;
  return {
    bmrKcal: bmr,
    activeKcal: active ?? 0,
    burnedKcal: burned,
    eatenKcal: eaten,
    deficitKcal: deficit,
    hasActive: active !== null,
    status: eaten === 0 ? 'pending' : deficit >= 0 ? 'deficit' : 'surplus'
  };
}

/**
 * The BMR to use for a given day: the most recent reading on or before it.
 *
 * Weigh-ins are not daily, and BMR barely moves between them, so carrying the
 * last one forward is closer to the truth than treating the gap as unknown.
 */
export function bmrOnOrBefore(
  entries: { date: string; bmrKcal: number | null }[],
  date: string
): number | null {
  let best: { date: string; bmrKcal: number } | null = null;
  for (const entry of entries) {
    if (entry.bmrKcal === null || entry.date > date) continue;
    if (!best || entry.date > best.date) best = { date: entry.date, bmrKcal: entry.bmrKcal };
  }
  return best?.bmrKcal ?? null;
}

/**
 * Weight change across a date window, for checking an estimated deficit
 * against what the scale actually did. Null unless the window holds at least
 * two weigh-ins to difference.
 */
export function weightChangeBetween(
  metrics: { date: string; weightKg: number }[],
  from: string,
  to: string
): number | null {
  const inWindow = metrics
    .filter((m) => m.date >= from && m.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (inWindow.length < 2) return null;
  return inWindow[inWindow.length - 1].weightKg - inWindow[0].weightKg;
}

export type DeficitDay = { date: string; deficitKcal: number | null };

export type DeficitSummary = {
  /** Days with both a BMR and an intake figure — the rest are not counted. */
  days: number;
  totalKcal: number;
  averageKcal: number;
  /** Signed like a weight change: a deficit predicts a negative number. */
  projectedChangeKg: number;
};

/**
 * Aggregates complete days only. A day with no BMR is skipped rather than
 * counted as zero, so a run of missing data reads as less evidence instead of
 * a smaller average.
 */
export function deficitSummary(days: DeficitDay[]): DeficitSummary | null {
  const complete = days.filter((d) => d.deficitKcal !== null) as {
    date: string;
    deficitKcal: number;
  }[];
  if (complete.length === 0) return null;

  const totalKcal = complete.reduce((sum, d) => sum + d.deficitKcal, 0);
  return {
    days: complete.length,
    totalKcal,
    averageKcal: totalKcal / complete.length,
    projectedChangeKg: -totalKcal / KCAL_PER_KG_FAT
  };
}
