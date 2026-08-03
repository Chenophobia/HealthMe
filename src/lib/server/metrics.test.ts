import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { addBodyMetric, listMetrics } from './metrics';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('addBodyMetric', () => {
  it('stores a weigh-in with optional body fat', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79.3, bodyFatPct: 27.5 });
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.1 });
    const rows = listMetrics(db, user.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].bodyFatPct).toBeCloseTo(27.5);
    expect(rows[1].bodyFatPct).toBeNull();
  });

  it('replaces a same-day entry instead of duplicating (latest wins)', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 80.0 });
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79.3, bodyFatPct: 27.5 });
    const rows = listMetrics(db, user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].weightKg).toBeCloseTo(79.3);
  });

  it('rejects nonsense values', () => {
    const { db, user } = setup();
    expect(() => addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 0 })).toThrow();
    expect(() =>
      addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79, bodyFatPct: 101 })
    ).toThrow();
  });

  it('returns metrics sorted by date ascending', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.1 });
    addBodyMetric(db, user.id, { date: '2026-08-01', weightKg: 79.6 });
    expect(listMetrics(db, user.id).map((r) => r.date)).toEqual(['2026-08-01', '2026-08-03']);
  });
});

describe('addBodyMetric — BMR', () => {
  it('stores the reading off the same weigh-in, rounded to whole kcal', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 85.4, bmrKcal: 1776.6 });
    expect(listMetrics(db, user.id)[0].bmrKcal).toBe(1777);
  });

  it('is null when the scale did not report one', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 85.4 });
    expect(listMetrics(db, user.id)[0].bmrKcal).toBeNull();
  });

  it('clears on a re-weigh that omits it — the day is replaced wholesale', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 85.4, bmrKcal: 1777 });
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 85.2 });
    expect(listMetrics(db, user.id)[0].bmrKcal).toBeNull();
  });

  it('rejects a slipped decimal or a kJ/kcal mix-up', () => {
    const { db, user } = setup();
    const bad = (bmrKcal: number) =>
      addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 85.4, bmrKcal });
    expect(() => bad(177)).toThrow();
    expect(() => bad(17_770)).toThrow();
    expect(() => bad(Number.NaN)).toThrow();
  });
});
