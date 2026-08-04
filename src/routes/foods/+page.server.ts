import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { addFood, updateFood, archiveFood, restoreFood, listFoods } from '$lib/server/foods';
import { baseQuantityFor, FOOD_UNITS, type FoodUnit } from '$lib/foods';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
  foods: listFoods(db, locals.user!.id, true)
});

function unitOf(form: FormData): FoodUnit {
  const unit = String(form.get('unit'));
  if (!(FOOD_UNITS as string[]).includes(unit)) throw new Error('bad unit');
  return unit as FoodUnit;
}

/**
 * The form asks for nutrition "per 100 g" or "per item" rather than for a base
 * quantity — that's how packets are labelled, and it keeps a units decision off
 * the screen.
 */
function inputOf(form: FormData) {
  const unit = unitOf(form);
  const defaultRaw = String(form.get('defaultQty') ?? '').trim();
  return {
    name: String(form.get('name') ?? ''),
    unit,
    baseQty: baseQuantityFor(unit),
    kcal: Number(String(form.get('kcal') ?? '').trim()),
    proteinG: Number(String(form.get('proteinG') ?? '').trim()),
    defaultQty: defaultRaw === '' ? baseQuantityFor(unit) : Number(defaultRaw)
  };
}

const BAD_INPUT =
  'Name is required; kcal and protein must be numbers, and the usual portion above zero.';

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      addFood(db, locals.user!.id, inputOf(form));
    } catch {
      return fail(400, { error: BAD_INPUT });
    }
    return { ok: true };
  },

  update: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      if (!updateFood(db, locals.user!.id, Number(form.get('id')), inputOf(form))) {
        return fail(404, { error: 'No such food.' });
      }
    } catch {
      return fail(400, { error: BAD_INPUT });
    }
    return { ok: true };
  },

  archive: async ({ request, locals }) => {
    const form = await request.formData();
    archiveFood(db, locals.user!.id, Number(form.get('id')));
    return { ok: true };
  },

  restore: async ({ request, locals }) => {
    const form = await request.formData();
    restoreFood(db, locals.user!.id, Number(form.get('id')));
    return { ok: true };
  }
};
