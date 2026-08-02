import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { seedIfEmpty } from './seed/run';
import { users, exercises, workoutSets } from './db/schema';
import { eq } from 'drizzle-orm';
import {
  getOrCreateSession,
  logSet,
  setsForSession,
  lastSetsForExercise,
  deleteSet
} from './workouts';

function setup() {
  const db = createTestDb();
  seedIfEmpty(db);
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  const chestPress = db.select().from(exercises).where(eq(exercises.name, 'Chest press')).all()[0];
  return { db, user, chestPress };
}

describe('getOrCreateSession', () => {
  it('creates once and returns the same session thereafter', () => {
    const { db, user } = setup();
    const a = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    const b = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    expect(a.id).toBe(b.id);
  });
});

describe('logSet', () => {
  it('auto-increments set numbers per exercise within a session', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    logSet(db, user.id, s.id, chestPress.id, 30, 12);
    logSet(db, user.id, s.id, chestPress.id, 30, 11);
    const sets = setsForSession(db, s.id);
    expect(sets.map((x) => x.setNumber)).toEqual([1, 2]);
  });

  it('rejects a session owned by another user', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    expect(() => logSet(db, user.id + 1, s.id, chestPress.id, 30, 12)).toThrow(/session/i);
  });

  it('rejects nonsense weight/reps', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    expect(() => logSet(db, user.id, s.id, chestPress.id, -5, 12)).toThrow();
    expect(() => logSet(db, user.id, s.id, chestPress.id, 30, 0)).toThrow();
  });
});

describe('lastSetsForExercise', () => {
  it('returns the most recent prior session sets for that exercise', () => {
    const { db, user, chestPress } = setup();
    const mon = getOrCreateSession(db, user.id, '2026-07-27', 'push');
    logSet(db, user.id, mon.id, chestPress.id, 27.5, 12);
    logSet(db, user.id, mon.id, chestPress.id, 27.5, 10);
    const wed = getOrCreateSession(db, user.id, '2026-07-29', 'push');
    logSet(db, user.id, wed.id, chestPress.id, 30, 10);

    const last = lastSetsForExercise(db, user.id, chestPress.id, '2026-08-03');
    expect(last?.date).toBe('2026-07-29');
    expect(last?.sets.map((s) => s.weightKg)).toEqual([30]);
  });

  it('is null with no history', () => {
    const { db, user, chestPress } = setup();
    expect(lastSetsForExercise(db, user.id, chestPress.id, '2026-08-03')).toBeNull();
  });
});

describe('deleteSet', () => {
  it('deletes only caller-owned sets', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    logSet(db, user.id, s.id, chestPress.id, 30, 12);
    const [row] = db.select().from(workoutSets).all();
    deleteSet(db, user.id + 1, row.id);
    expect(db.select().from(workoutSets).all()).toHaveLength(1);
    deleteSet(db, user.id, row.id);
    expect(db.select().from(workoutSets).all()).toHaveLength(0);
  });
});
