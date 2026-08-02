import { describe, it, expect } from 'vitest';
import { createTestDb } from './test-db';
import { users, bodyMetrics, mealLogs, workoutSessions, workoutSets, exercises } from './schema';

describe('schema', () => {
  it('round-trips a body metric', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: '2026-08-02T00:00:00Z' })
      .returning()
      .all();
    db.insert(bodyMetrics)
      .values({
        userId: u.id,
        date: '2026-08-02',
        weightKg: 79.3,
        bodyFatPct: 27.5,
        loggedAt: '2026-08-02T08:00:00Z'
      })
      .run();
    const rows = db.select().from(bodyMetrics).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].weightKg).toBeCloseTo(79.3);
    expect(rows[0].bodyFatPct).toBeCloseTo(27.5);
  });

  it('rejects two workout sessions of the same type on the same day', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    const row = { userId: u.id, date: '2026-08-03', sessionType: 'push', createdAt: 'now' };
    db.insert(workoutSessions).values(row).run();
    expect(() => db.insert(workoutSessions).values(row).run()).toThrow();
  });

  it('allows a meal log with a null recipeId and a customName', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    db.insert(mealLogs)
      .values({
        userId: u.id,
        date: '2026-08-02',
        mealSlot: 'lunch',
        customName: 'Leftover pizza',
        kcal: 700,
        proteinG: 25,
        loggedAt: 'now'
      })
      .run();
    expect(db.select().from(mealLogs).all()[0].recipeId).toBeNull();
  });

  it('enforces the exercises FK on workout sets', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    const [s] = db
      .insert(workoutSessions)
      .values({ userId: u.id, date: '2026-08-03', sessionType: 'push', createdAt: 'now' })
      .returning()
      .all();
    expect(() =>
      db
        .insert(workoutSets)
        .values({
          sessionId: s.id,
          exerciseId: 999,
          setNumber: 1,
          weightKg: 20,
          reps: 10,
          createdAt: 'now'
        })
        .run()
    ).toThrow();
    void exercises;
  });
});
