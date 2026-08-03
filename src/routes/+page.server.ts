import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dayTotals } from '$lib/server/meals';
import { addBodyMetric, listMetrics } from '$lib/server/metrics';
import { activeEnergyForDate, setActiveEnergy } from '$lib/server/activity';
import { mealStreak } from '$lib/server/streaks';
import { todayLocal, isValidDate, scheduledSessionFor } from '$lib/dates';
import { bmrOnOrBefore } from '$lib/energy';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  const metrics = listMetrics(db, locals.user!.id);
  const activity = activeEnergyForDate(db, locals.user!.id, date);
  return {
    date,
    scheduled: scheduledSessionFor(date),
    totals: dayTotals(db, locals.user!.id, date),
    streak: mealStreak(db, locals.user!.id, date),
    latest: metrics.at(-1) ?? null,
    recent: metrics.slice(-30),
    // Carried forward from the last weigh-in that recorded one — weigh-ins
    // aren't daily and BMR barely moves between them.
    bmrKcal: bmrOnOrBefore(metrics, date),
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
  }
};
