import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { seedIfEmpty } from './seed/run';
import { users, workoutSessions } from './db/schema';
import { logCustomMeal } from './meals';
import { mealStreak, sessionsThisWeek } from './streaks';

function setup() {
  const db = createTestDb();
  seedIfEmpty(db);
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

describe('sessionsThisWeek', () => {
  it('counts sessions in the Monday-anchored week of `today`', () => {
    const { db, user } = setup();
    // 2026-08-02 is a Sunday; its week is Mon 07-27 .. Sun 08-02.
    db.insert(workoutSessions)
      .values([
        { userId: user.id, date: '2026-07-27', sessionType: 'push', createdAt: 'now' },
        { userId: user.id, date: '2026-07-29', sessionType: 'pull', createdAt: 'now' },
        { userId: user.id, date: '2026-07-26', sessionType: 'legs', createdAt: 'now' } // prior week
      ])
      .run();
    expect(sessionsThisWeek(db, user.id, '2026-08-02')).toEqual({ done: 2, target: 3 });
  });
});
