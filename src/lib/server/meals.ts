import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { mealLogs, recipes } from './db/schema';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function logRecipeMeal(
  db: Db,
  userId: number,
  date: string,
  mealSlot: MealSlot,
  recipeId: number,
  now: Date = new Date()
): void {
  const [recipe] = db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1).all();
  if (!recipe) throw new Error(`Unknown recipe id ${recipeId}`);
  db.insert(mealLogs)
    .values({
      userId,
      date,
      mealSlot,
      recipeId,
      kcal: recipe.kcal,
      proteinG: recipe.proteinG,
      loggedAt: now.toISOString()
    })
    .run();
}

export function logCustomMeal(
  db: Db,
  userId: number,
  date: string,
  mealSlot: MealSlot,
  name: string,
  kcal: number,
  proteinG: number,
  now: Date = new Date()
): void {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Custom meal needs a name');
  if (!Number.isFinite(kcal) || kcal < 0) throw new Error('kcal must be a non-negative number');
  if (!Number.isFinite(proteinG) || proteinG < 0)
    throw new Error('protein must be a non-negative number');
  db.insert(mealLogs)
    .values({
      userId,
      date,
      mealSlot,
      customName: trimmed,
      kcal: Math.round(kcal),
      proteinG: Math.round(proteinG),
      loggedAt: now.toISOString()
    })
    .run();
}

export function mealsForDate(db: Db, userId: number, date: string) {
  return db
    .select({
      id: mealLogs.id,
      mealSlot: mealLogs.mealSlot,
      recipeCode: recipes.code,
      name: sql<string>`coalesce(${recipes.name}, ${mealLogs.customName})`,
      kcal: mealLogs.kcal,
      proteinG: mealLogs.proteinG,
      loggedAt: mealLogs.loggedAt
    })
    .from(mealLogs)
    .leftJoin(recipes, eq(recipes.id, mealLogs.recipeId))
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)))
    .orderBy(mealLogs.loggedAt)
    .all();
}

export function dayTotals(
  db: Db,
  userId: number,
  date: string
): { kcal: number; proteinG: number } {
  const [row] = db
    .select({
      kcal: sql<number>`coalesce(sum(${mealLogs.kcal}), 0)`,
      proteinG: sql<number>`coalesce(sum(${mealLogs.proteinG}), 0)`
    })
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)))
    .all();
  return row;
}

/** Calories logged per day, oldest first — the intake side of the deficit. */
export function dailyKcalTotals(db: Db, userId: number): { date: string; kcal: number }[] {
  return db
    .select({
      date: mealLogs.date,
      kcal: sql<number>`coalesce(sum(${mealLogs.kcal}), 0)`
    })
    .from(mealLogs)
    .where(eq(mealLogs.userId, userId))
    .groupBy(mealLogs.date)
    .orderBy(mealLogs.date)
    .all();
}

export function deleteMealLog(db: Db, userId: number, id: number): void {
  db.delete(mealLogs)
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, userId)))
    .run();
}
