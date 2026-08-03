import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dayTotals } from '$lib/server/meals';
import { addBodyMetric, listMetrics } from '$lib/server/metrics';
import { activeEnergyForDate, listActiveEnergy, setActiveEnergy } from '$lib/server/activity';
import { mealStreak } from '$lib/server/streaks';
import { getProfile, setProfile } from '$lib/server/profile';
import { todayLocal, isValidDate, scheduledSessionFor } from '$lib/dates';
import { KCAL_FLOOR } from '$lib/targets';
import { resolveBmr, goalPace, typicalActive, goalIntake } from '$lib/energy';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  const metrics = listMetrics(db, locals.user!.id);
  const activity = activeEnergyForDate(db, locals.user!.id, date);
  const profile = getProfile(db, locals.user!.id);
  // Computed from today's weight unless a reading was logged today.
  const bmr = resolveBmr(date, metrics, profile);

  /*
   * Work the intake target back from the goal, if there is one. Planned
   * against an *average* of recent activity rather than today's running
   * total, so the number is stable enough to plan meals against and doesn't
   * climb as the day's movement accumulates.
   */
  const latest = metrics.at(-1) ?? null;
  const pace =
    profile.goalWeightKg !== null && profile.goalDate !== null && latest
      ? goalPace({
          currentKg: latest.weightKg,
          goalKg: profile.goalWeightKg,
          today: date,
          goalDate: profile.goalDate
        })
      : null;
  const intake =
    pace && !pace.reached && !pace.expired
      ? goalIntake({
          bmrKcal: bmr?.kcal ?? null,
          typicalActiveKcal: typicalActive(listActiveEnergy(db, locals.user!.id)),
          requiredDeficitKcal: pace.perDayKcal,
          floorKcal: KCAL_FLOOR
        })
      : null;

  return {
    date,
    scheduled: scheduledSessionFor(date),
    totals: dayTotals(db, locals.user!.id, date),
    streak: mealStreak(db, locals.user!.id, date),
    latest,
    recent: metrics.slice(-30),
    profile,
    pace,
    intake,
    bmrKcal: bmr?.kcal ?? null,
    bmrSource: bmr?.source ?? null,
    activeKcal: activity?.activeKcal ?? null,
    activitySource: activity?.source ?? null
  };
};

export const actions: Actions = {
  weighin: async ({ request, locals }) => {
    const form = await request.formData();
    const weightKg = Number(form.get('weightKg'));
    const bfRaw = String(form.get('bodyFatPct') ?? '').trim();
    const bmrRaw = String(form.get('bmrKcal') ?? '').trim();
    const today = todayLocal();
    const dateRaw = String(form.get('date') ?? '').trim();
    const date = dateRaw === '' ? today : dateRaw;
    if (!isValidDate(date) || date > today) {
      return fail(400, { error: 'Date must be a real day, today or earlier.' });
    }
    try {
      addBodyMetric(db, locals.user!.id, {
        date,
        weightKg,
        bodyFatPct: bfRaw === '' ? null : Number(bfRaw),
        bmrKcal: bmrRaw === '' ? null : Number(bmrRaw)
      });
    } catch {
      return fail(400, {
        error: 'Weight must be a positive number; body fat 0–100, BMR 500–5000, or blank.'
      });
    }
    return { ok: true, date };
  },

  activity: async ({ request, locals }) => {
    const form = await request.formData();
    const today = todayLocal();
    const dateRaw = String(form.get('date') ?? '').trim();
    const date = dateRaw === '' ? today : dateRaw;
    if (!isValidDate(date) || date > today) {
      return fail(400, { activityError: 'Date must be a real day, today or earlier.' });
    }
    try {
      setActiveEnergy(db, locals.user!.id, {
        date,
        activeKcal: Number(String(form.get('activeKcal') ?? '').trim()),
        source: 'manual'
      });
    } catch {
      return fail(400, { activityError: 'Active energy must be a whole number of kcal.' });
    }
    return { activityOk: true, date };
  },

  profile: async ({ request, locals }) => {
    const form = await request.formData();
    const heightRaw = String(form.get('heightCm') ?? '').trim();
    const birthRaw = String(form.get('birthDate') ?? '').trim();
    const sexRaw = String(form.get('sex') ?? '').trim();
    try {
      // Body facts only — the goal is a separate form, and setProfile writes
      // just the keys it is handed.
      setProfile(db, locals.user!.id, {
        heightCm: heightRaw === '' ? null : Number(heightRaw),
        birthDate: birthRaw === '' ? null : birthRaw,
        sex: sexRaw === '' ? null : sexRaw
      });
    } catch {
      return fail(400, {
        profileError: 'Height must be 50–260 cm, and the birth date a real day in the past.'
      });
    }
    return { profileOk: true };
  },

  goal: async ({ request, locals }) => {
    const form = await request.formData();
    const goalKgRaw = String(form.get('goalWeightKg') ?? '').trim();
    const goalDateRaw = String(form.get('goalDate') ?? '').trim();
    try {
      setProfile(db, locals.user!.id, {
        goalWeightKg: goalKgRaw === '' ? null : Number(goalKgRaw),
        goalDate: goalDateRaw === '' ? null : goalDateRaw
      });
    } catch {
      return fail(400, {
        goalError: 'Goal weight must be 30–500 kg, and the date a real day.'
      });
    }
    return { goalOk: true };
  }
};
