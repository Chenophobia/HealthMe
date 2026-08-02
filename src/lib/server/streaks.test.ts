import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { logCustomMeal } from './meals';
import { mealStreak } from './streaks';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('mealStreak', () => {
  it('counts consecutive logged days ending today', () => {
    const { db, user } = setup();
    for (const d of ['2026-07-31', '2026-08-01', '2026-08-02']) {
      logCustomMeal(db, user.id, d, 'lunch', 'x', 500, 30);
    }
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(3);
  });

  it('still counts when today is not yet logged (yesterday anchors)', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-08-01', 'lunch', 'x', 500, 30);
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(1);
  });

  it('breaks on a gap', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-07-30', 'lunch', 'x', 500, 30);
    logCustomMeal(db, user.id, '2026-08-02', 'lunch', 'x', 500, 30);
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(1);
  });

  it('is zero with nothing logged today or yesterday', () => {
    const { db, user } = setup();
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(0);
  });
});
