import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { addBodyMetric } from './metrics';
import { setActiveEnergy } from './activity';
import { logCustomMeal } from './meals';
import { setProfile } from './profile';
import { dailyTarget } from './target';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  setProfile(
    db,
    user.id,
    {
      heightCm: 169,
      birthDate: '1997-02-28',
      sex: 'male',
      goalWeightKg: 76,
      goalDate: '2026-09-08'
    },
    '2026-08-04'
  );
  return { db, user };
}

/** A day that lands exactly on the pace, so the carry is easy to reason about. */
function logDay(
  db: ReturnType<typeof createTestDb>,
  userId: number,
  date: string,
  kcal: number,
  activeKcal: number
) {
  logCustomMeal(db, userId, date, 'dinner', 'day', kcal, 50);
  setActiveEnergy(db, userId, { date, activeKcal, source: 'manual' });
}

describe('dailyTarget carry', () => {
  /*
   * The rule that's easy to get wrong: a morning weigh-in reflects the days
   * *before* it, so the weigh-in day's own eating is still uncounted and must
   * carry. Excluding it would silently drop the most recent full day.
   */
  it('carries the weigh-in day itself, not just the days after it', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.9 });
    logDay(db, user.id, '2026-08-03', 2600, 0); // deliberately a poor day

    const { carry } = dailyTarget(db, user.id, '2026-08-04');
    expect(carry).not.toBeNull();
    expect(carry!.days).toBe(1);
    expect(carry!.kcal).toBeGreaterThan(0); // behind the pace
  });

  it('leaves out days the scale has already priced in', () => {
    const { db, user } = setup();
    logDay(db, user.id, '2026-08-01', 2600, 0);
    // Weighing in on the 2nd absorbs the 1st, so only the 2nd and 3rd carry.
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79.9 });
    logDay(db, user.id, '2026-08-02', 2600, 0);
    logDay(db, user.id, '2026-08-03', 2600, 0);

    expect(dailyTarget(db, user.id, '2026-08-04').carry!.days).toBe(2);
  });

  it("leaves today out of the carry — the day isn't over", () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-04', weightKg: 79.9 });
    logDay(db, user.id, '2026-08-04', 300, 0);

    expect(dailyTarget(db, user.id, '2026-08-04').carry).toBeNull();
  });

  it('goes negative on a day that beat the pace', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.9 });
    logDay(db, user.id, '2026-08-03', 1000, 900); // big burn, small intake

    expect(dailyTarget(db, user.id, '2026-08-04').carry!.kcal).toBeLessThan(0);
  });

  it('falls back to the program anchor with no goal set', () => {
    const { db, user } = setup();
    setProfile(db, user.id, { goalWeightKg: null, goalDate: null });
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.9 });

    const t = dailyTarget(db, user.id, '2026-08-04');
    expect(t.pace).toBeNull();
    expect(t.carry).toBeNull();
    expect(t.kcalTarget).toBe(1750);
  });

  it('never targets below the floor', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.9 });

    expect(dailyTarget(db, user.id, '2026-08-04').kcalTarget).toBe(1600);
  });
});
