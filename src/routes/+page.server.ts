import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dayTotals } from '$lib/server/meals';
import { addBodyMetric, listMetrics } from '$lib/server/metrics';
import { mealStreak, sessionsThisWeek } from '$lib/server/streaks';
import { todayLocal, scheduledSessionFor } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  const metrics = listMetrics(db, locals.user!.id);
  return {
    date,
    scheduled: scheduledSessionFor(date),
    totals: dayTotals(db, locals.user!.id, date),
    streak: mealStreak(db, locals.user!.id, date),
    week: sessionsThisWeek(db, locals.user!.id, date),
    latest: metrics.at(-1) ?? null,
    recent: metrics.slice(-30)
  };
};

export const actions: Actions = {
  weighin: async ({ request, locals }) => {
    const form = await request.formData();
    const weightKg = Number(form.get('weightKg'));
    const bfRaw = String(form.get('bodyFatPct') ?? '').trim();
    try {
      addBodyMetric(db, locals.user!.id, {
        date: todayLocal(),
        weightKg,
        bodyFatPct: bfRaw === '' ? null : Number(bfRaw)
      });
    } catch {
      return fail(400, { error: 'Weight must be a positive number; body fat 0–100 or blank.' });
    }
    return { ok: true };
  }
};
