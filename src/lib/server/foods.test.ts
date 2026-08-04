import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { addFood, updateFood, archiveFood, restoreFood, listFoods, findFood } from './foods';
import { logFoodMeal, mealsForDate, dayTotals } from './meals';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

const chicken = { name: 'Chicken breast', unit: 'g' as const, kcal: 165, proteinG: 31 };

describe('foods', () => {
  it('defaults the base quantity from the unit', () => {
    const { db, user } = setup();
    const g = addFood(db, user.id, chicken);
    const item = addFood(db, user.id, { name: 'Banana', unit: 'item', kcal: 105, proteinG: 1.3 });
    expect(g.baseQty).toBe(100);
    expect(item.baseQty).toBe(1);
  });

  it('rejects nonsense before it reaches the picker', () => {
    const { db, user } = setup();
    expect(() => addFood(db, user.id, { ...chicken, name: '  ' })).toThrow();
    expect(() => addFood(db, user.id, { ...chicken, kcal: -1 })).toThrow();
    // Per-kg figures pasted into a per-100 g field.
    expect(() => addFood(db, user.id, { ...chicken, kcal: 16500 })).toThrow();
    expect(() => addFood(db, user.id, { ...chicken, defaultQty: 0 })).toThrow();
  });

  it('edits an existing food', () => {
    const { db, user } = setup();
    const f = addFood(db, user.id, chicken);
    expect(updateFood(db, user.id, f.id, { ...chicken, kcal: 170 })).toBe(true);
    expect(findFood(db, user.id, f.id)!.kcal).toBe(170);
  });

  it('hides a food from the picker without destroying it', () => {
    const { db, user } = setup();
    const f = addFood(db, user.id, chicken);
    archiveFood(db, user.id, f.id);

    expect(listFoods(db, user.id).map((x) => x.id)).not.toContain(f.id);
    expect(listFoods(db, user.id, true).map((x) => x.id)).toContain(f.id);

    restoreFood(db, user.id, f.id);
    expect(listFoods(db, user.id).map((x) => x.id)).toContain(f.id);
  });

  it("does not touch another user's foods", () => {
    const { db, user } = setup();
    const [other] = db
      .insert(users)
      .values({ username: 'other', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    const f = addFood(db, other.id, chicken);
    expect(updateFood(db, user.id, f.id, { ...chicken, kcal: 999 })).toBe(false);
    expect(archiveFood(db, user.id, f.id)).toBe(false);
    expect(findFood(db, user.id, f.id)).toBeNull();
  });
});

describe('logging a portion', () => {
  it('snapshots the scaled figures and keeps the portion', () => {
    const { db, user } = setup();
    const f = addFood(db, user.id, chicken);
    logFoodMeal(db, user.id, '2026-08-04', 'lunch', f.id, 200);

    const [log] = mealsForDate(db, user.id, '2026-08-04');
    expect(log).toMatchObject({ name: 'Chicken breast', quantity: 200, unit: 'g', kcal: 330 });
    expect(dayTotals(db, user.id, '2026-08-04')).toEqual({ kcal: 330, proteinG: 62 });
  });

  it('adds up across several ingredients in one meal', () => {
    const { db, user } = setup();
    const c = addFood(db, user.id, chicken);
    const p = addFood(db, user.id, { name: 'Potato', unit: 'g', kcal: 77, proteinG: 2 });
    logFoodMeal(db, user.id, '2026-08-04', 'lunch', c.id, 200);
    logFoodMeal(db, user.id, '2026-08-04', 'lunch', p.id, 200);

    expect(mealsForDate(db, user.id, '2026-08-04')).toHaveLength(2);
    expect(dayTotals(db, user.id, '2026-08-04').kcal).toBe(330 + 154);
  });

  /* The snapshot is the point: correcting a food must not rewrite history. */
  it('leaves logged meals alone when the food is later corrected', () => {
    const { db, user } = setup();
    const f = addFood(db, user.id, chicken);
    logFoodMeal(db, user.id, '2026-08-04', 'lunch', f.id, 200);
    updateFood(db, user.id, f.id, { ...chicken, kcal: 500 });

    expect(dayTotals(db, user.id, '2026-08-04').kcal).toBe(330);
  });

  it('refuses a zero or negative portion', () => {
    const { db, user } = setup();
    const f = addFood(db, user.id, chicken);
    expect(() => logFoodMeal(db, user.id, '2026-08-04', 'lunch', f.id, 0)).toThrow();
    expect(() => logFoodMeal(db, user.id, '2026-08-04', 'lunch', f.id, -5)).toThrow();
  });

  it('refuses an unknown food', () => {
    const { db, user } = setup();
    expect(() => logFoodMeal(db, user.id, '2026-08-04', 'lunch', 999, 100)).toThrow();
  });
});
