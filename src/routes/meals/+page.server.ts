import { fail, redirect } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { recipes } from '$lib/server/db/schema';
import {
  MEAL_SLOTS,
  type MealSlot,
  logRecipeMeal,
  logCustomMeal,
  mealsForDate,
  dayTotals,
  deleteMealLog
} from '$lib/server/meals';
import { todayLocal, isValidDate, shiftDate } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const today = todayLocal();
  const picked = url.searchParams.get('date');
  // A malformed ?date= would silently show today under a lying URL — send
  // the browser to the canonical today-URL instead.
  if (picked !== null && !isValidDate(picked)) throw redirect(303, '/meals');
  const date = picked ?? today;
  return {
    date,
    today,
    prevDate: shiftDate(date, -1),
    nextDate: shiftDate(date, 1),
    recipes: db.select().from(recipes).orderBy(asc(recipes.displayOrder)).all(),
    logs: mealsForDate(db, locals.user!.id, date),
    totals: dayTotals(db, locals.user!.id, date)
  };
};

function slotOf(form: FormData): MealSlot {
  const slot = String(form.get('mealSlot'));
  if (!(MEAL_SLOTS as string[]).includes(slot)) throw new Error('bad slot');
  return slot as MealSlot;
}

/** The date the page was viewing when submitted — carried in a hidden field. */
function dateOf(form: FormData): string {
  const date = String(form.get('date') ?? '');
  if (!isValidDate(date)) throw new Error('bad date');
  return date;
}

export const actions: Actions = {
  recipe: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      logRecipeMeal(db, locals.user!.id, dateOf(form), slotOf(form), Number(form.get('recipeId')));
    } catch {
      return fail(400, { recipeError: 'Could not log that recipe.' });
    }
    return { ok: true };
  },
  custom: async ({ request, locals }) => {
    const form = await request.formData();
    const kcalRaw = String(form.get('kcal') ?? '').trim();
    const proteinRaw = String(form.get('proteinG') ?? '').trim();
    if (!kcalRaw || !proteinRaw) {
      return fail(400, { error: 'Name, kcal and protein are required (kcal/protein ≥ 0).' });
    }
    try {
      logCustomMeal(
        db,
        locals.user!.id,
        dateOf(form),
        slotOf(form),
        String(form.get('name') ?? ''),
        Number(kcalRaw),
        Number(proteinRaw)
      );
    } catch {
      return fail(400, { error: 'Name, kcal and protein are required (kcal/protein ≥ 0).' });
    }
    return { ok: true };
  },
  delete: async ({ request, locals }) => {
    const form = await request.formData();
    deleteMealLog(db, locals.user!.id, Number(form.get('id')));
    return { ok: true };
  }
};
