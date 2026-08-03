import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dayTotals } from '$lib/server/meals';
import { addBodyMetric, listMetrics } from '$lib/server/metrics';
import { activeEnergyForDate, setActiveEnergy } from '$lib/server/activity';
import { mealStreak } from '$lib/server/streaks';
import { getProfile, setProfile } from '$lib/server/profile';
import { todayLocal, isValidDate, scheduledSessionFor, shiftDate } from '$lib/dates';
import { dailyTarget } from '$lib/server/target';
import { resolveBmr } from '$lib/energy';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const today = todayLocal();
  const picked = url.searchParams.get('date');
  // A malformed ?date= would silently show today under a lying URL — send the
  // browser to the canonical today-URL instead. Same rule as /meals.
  if (picked !== null && !isValidDate(picked)) throw redirect(303, '/');
  const date = picked ?? today;

  const metrics = listMetrics(db, locals.user!.id);
  const activity = activeEnergyForDate(db, locals.user!.id, date);
  const profile = getProfile(db, locals.user!.id);
  // Computed from the viewed day's weight unless a reading was logged on it.
  const bmr = resolveBmr(date, metrics, profile);

  // The goal is about where you are now, so it is paced from today and the
  // latest weigh-in — not from whatever day happens to be on screen.
  const { pace, intake, kcalTarget } = dailyTarget(db, locals.user!.id, today);

  // The weigh-in shown is the one for the day on screen, falling back to the
  // most recent before it — the "On" column names which, so it can't mislead.
  const onOrBefore = metrics.filter((m) => m.date <= date);

  return {
    date,
    today,
    prevDate: shiftDate(date, -1),
    nextDate: shiftDate(date, 1),
    scheduled: scheduledSessionFor(date),
    totals: dayTotals(db, locals.user!.id, date),
    streak: mealStreak(db, locals.user!.id, date),
    latest: onOrBefore.at(-1) ?? null,
    recent: metrics.slice(-30),
    profile,
    pace,
    intake,
    kcalTarget,
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
