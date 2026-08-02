import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { seedIfEmpty } from './seed/run';
import { users, recipes, mealLogs } from './db/schema';
import { eq } from 'drizzle-orm';
import { logRecipeMeal, logCustomMeal, mealsForDate, dayTotals, deleteMealLog } from './meals';

function setup() {
  const db = createTestDb();
  seedIfEmpty(db);
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  const r1 = db.select().from(recipes).where(eq(recipes.code, 'R1')).all()[0];
  return { db, user, r1 };
}

describe('logRecipeMeal', () => {
  it('snapshots the recipe macros onto the log row', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    const [row] = db.select().from(mealLogs).all();
    expect(row.kcal).toBe(530);
    expect(row.proteinG).toBe(54);
    expect(row.recipeId).toBe(r1.id);
    expect(row.customName).toBeNull();
  });

  it('throws on an unknown recipe id', () => {
    const { db, user } = setup();
    expect(() => logRecipeMeal(db, user.id, '2026-08-02', 'lunch', 9999)).toThrow(/recipe/i);
  });
});

describe('logCustomMeal', () => {
  it('stores name and macros with no recipe reference', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-08-02', 'dinner', 'Takeaway ramen', 800, 30);
    const [row] = db.select().from(mealLogs).all();
    expect(row.customName).toBe('Takeaway ramen');
    expect(row.recipeId).toBeNull();
    expect(row.kcal).toBe(800);
  });

  it('rejects empty names and negative macros', () => {
    const { db, user } = setup();
    expect(() => logCustomMeal(db, user.id, '2026-08-02', 'dinner', '  ', 500, 20)).toThrow();
    expect(() => logCustomMeal(db, user.id, '2026-08-02', 'dinner', 'x', -1, 20)).toThrow();
    expect(() => logCustomMeal(db, user.id, '2026-08-02', 'dinner', 'x', 500, -1)).toThrow();
  });
});

describe('mealsForDate / dayTotals', () => {
  it('returns logs for the date with recipe code and name joined', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    logCustomMeal(db, user.id, '2026-08-02', 'snack', 'Protein bar', 200, 20);
    logCustomMeal(db, user.id, '2026-08-01', 'dinner', 'Yesterday', 500, 30);

    const rows = mealsForDate(db, user.id, '2026-08-02');
    expect(rows).toHaveLength(2);
    const lunch = rows.find((r) => r.mealSlot === 'lunch')!;
    expect(lunch.recipeCode).toBe('R1');
    expect(lunch.name).toBe('Chicken, rice & broccoli');
    const snack = rows.find((r) => r.mealSlot === 'snack')!;
    expect(snack.recipeCode).toBeNull();
    expect(snack.name).toBe('Protein bar');
  });

  it('sums the day', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    logCustomMeal(db, user.id, '2026-08-02', 'snack', 'Bar', 200, 20);
    expect(dayTotals(db, user.id, '2026-08-02')).toEqual({ kcal: 730, proteinG: 74 });
  });

  it('totals zero on an unlogged day', () => {
    const { db, user } = setup();
    expect(dayTotals(db, user.id, '2026-08-02')).toEqual({ kcal: 0, proteinG: 0 });
  });
});

describe('deleteMealLog', () => {
  it('deletes only the caller-owned row', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    const [row] = db.select().from(mealLogs).all();
    deleteMealLog(db, user.id + 1, row.id); // wrong user — no-op
    expect(db.select().from(mealLogs).all()).toHaveLength(1);
    deleteMealLog(db, user.id, row.id);
    expect(db.select().from(mealLogs).all()).toHaveLength(0);
  });
});
