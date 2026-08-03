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

/* ========================= Estimating resting burn ========================= */

/** The only two coefficients Mifflin–St Jeor defines. */
export type Sex = 'male' | 'female';

export type BodyProfile = {
  heightCm: number | null;
  birthDate: string | null;
  sex: string | null;
};

/** Whole years old on a given day. Pure string arithmetic — no timezone to slip on. */
export function ageOn(birthDate: string, onDate: string): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const born = iso.exec(birthDate);
  const on = iso.exec(onDate);
  if (!born || !on) return null;

  const [, by, bm, bd] = born.map(Number);
  const [, oy, om, od] = on.map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age--;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Mifflin–St Jeor, the standard resting-burn estimate.
 *
 * Preferred over the scale's own figure because that one is derived from a
 * bioimpedance body-fat reading, which moves with how hydrated you are — the
 * same noise the weight dots already have, fed into a number that should be
 * near-constant. This moves only when weight does.
 */
export function mifflinStJeor(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
}): number | null {
  const { weightKg, heightCm, ageYears, sex } = input;
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) return null;
  if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260) return null;
  if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 130) return null;
  if (sex !== 'male' && sex !== 'female') return null;

  const offset = sex === 'male' ? 5 : -161;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + offset);
}

export type ResolvedBmr = { kcal: number; source: 'logged' | 'computed' };

/**
 * The BMR to use for a day, and where it came from.
 *
 * A figure logged on the day itself wins — that's an explicit override. Failing
 * that it's computed from the most recent weight, which is why a stale logged
 * reading is *not* carried forward ahead of it: a three-week-old bioimpedance
 * number is worse evidence than today's weight through the formula. The
 * carry-forward only survives as a fallback for an unfilled profile.
 */
export function resolveBmr(
  date: string,
  metrics: { date: string; weightKg: number; bmrKcal: number | null }[],
  profile: BodyProfile
): ResolvedBmr | null {
  const loggedToday = metrics.find((m) => m.date === date && m.bmrKcal !== null);
  if (loggedToday) return { kcal: loggedToday.bmrKcal as number, source: 'logged' };

  const ageYears = profile.birthDate ? ageOn(profile.birthDate, date) : null;
  if (profile.heightCm !== null && ageYears !== null && profile.sex) {
    const weight = latestWeightOnOrBefore(metrics, date);
    if (weight !== null) {
      const computed = mifflinStJeor({
        weightKg: weight,
        heightCm: profile.heightCm,
        ageYears,
        sex: profile.sex as Sex
      });
      if (computed !== null) return { kcal: computed, source: 'computed' };
    }
  }

  const carried = bmrOnOrBefore(metrics, date);
  return carried === null ? null : { kcal: carried, source: 'logged' };
}

function latestWeightOnOrBefore(
  metrics: { date: string; weightKg: number }[],
  date: string
): number | null {
  let best: { date: string; weightKg: number } | null = null;
  for (const m of metrics) {
    if (m.date > date) continue;
    if (!best || m.date > best.date) best = m;
  }
  return best?.weightKg ?? null;
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
