import { fail } from '@sveltejs/kit';
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
import { todayLocal } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  return {
    date,
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

export const actions: Actions = {
  recipe: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      logRecipeMeal(db, locals.user!.id, todayLocal(), slotOf(form), Number(form.get('recipeId')));
    } catch {
      return fail(400, { error: 'Could not log that recipe.' });
    }
    return { ok: true };
  },
  custom: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      logCustomMeal(
        db,
        locals.user!.id,
        todayLocal(),
        slotOf(form),
        String(form.get('name') ?? ''),
        Number(form.get('kcal')),
        Number(form.get('proteinG'))
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
