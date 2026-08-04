import { and, asc, eq, isNull, or } from 'drizzle-orm';
import type { Db } from './db/connect';
import { foods } from './db/schema';
import { FOOD_UNITS, baseQuantityFor, type FoodUnit } from '$lib/foods';

export type FoodInput = {
  name: string;
  unit: FoodUnit;
  kcal: number;
  proteinG: number;
  /** Per how much the figures above are — defaults to 100 g/ml or 1 item. */
  baseQty?: number;
  defaultQty?: number;
};

function validate(input: FoodInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Food needs a name');
  if (!FOOD_UNITS.includes(input.unit)) throw new Error(`Unknown unit ${input.unit}`);

  const baseQty = input.baseQty ?? baseQuantityFor(input.unit);
  if (!Number.isFinite(baseQty) || baseQty <= 0) throw new Error('baseQty must be positive');

  // A sanity ceiling, not a nutritional judgement: pure fat is ~900 kcal/100 g,
  // so anything past 1000 is a slipped decimal or per-kg figures.
  if (!Number.isFinite(input.kcal) || input.kcal < 0 || input.kcal > 10_000) {
    throw new Error('kcal out of range');
  }
  if (!Number.isFinite(input.proteinG) || input.proteinG < 0 || input.proteinG > 1_000) {
    throw new Error('protein out of range');
  }

  const defaultQty = input.defaultQty ?? baseQty;
  if (!Number.isFinite(defaultQty) || defaultQty <= 0)
    throw new Error('defaultQty must be positive');

  return {
    name,
    unit: input.unit,
    baseQty,
    defaultQty,
    kcal: input.kcal,
    proteinG: input.proteinG
  };
}

export function addFood(db: Db, userId: number, input: FoodInput, now: Date = new Date()) {
  const clean = validate(input);
  const [row] = db
    .insert(foods)
    .values({ ...clean, userId, createdAt: now.toISOString() })
    .returning()
    .all();
  return row;
}

export function updateFood(db: Db, userId: number, id: number, input: FoodInput): boolean {
  const clean = validate(input);
  // Seeded foods (userId null) are editable too — they're starters, not gospel.
  const updated = db
    .update(foods)
    .set(clean)
    .where(and(eq(foods.id, id), or(eq(foods.userId, userId), isNull(foods.userId))))
    .returning({ id: foods.id })
    .all();
  return updated.length > 0;
}

/**
 * Archives rather than deletes: every meal logged with this food points at it,
 * and removing the row would orphan that history.
 */
export function archiveFood(db: Db, userId: number, id: number, now: Date = new Date()): boolean {
  const updated = db
    .update(foods)
    .set({ archivedAt: now.toISOString() })
    .where(and(eq(foods.id, id), or(eq(foods.userId, userId), isNull(foods.userId))))
    .returning({ id: foods.id })
    .all();
  return updated.length > 0;
}

export function restoreFood(db: Db, userId: number, id: number): boolean {
  const updated = db
    .update(foods)
    .set({ archivedAt: null })
    .where(and(eq(foods.id, id), or(eq(foods.userId, userId), isNull(foods.userId))))
    .returning({ id: foods.id })
    .all();
  return updated.length > 0;
}

/** The picker's list: everything still in use, seeded or your own. */
export function listFoods(db: Db, userId: number, includeArchived = false) {
  const mine = or(eq(foods.userId, userId), isNull(foods.userId));
  return db
    .select()
    .from(foods)
    .where(includeArchived ? mine : and(mine, isNull(foods.archivedAt)))
    .orderBy(asc(foods.name))
    .all();
}

export function findFood(db: Db, userId: number, id: number) {
  const [row] = db
    .select()
    .from(foods)
    .where(and(eq(foods.id, id), or(eq(foods.userId, userId), isNull(foods.userId))))
    .limit(1)
    .all();
  return row ?? null;
}
