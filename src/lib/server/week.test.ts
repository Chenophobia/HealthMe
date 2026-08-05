import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { addBodyMetric } from './metrics';
import { setActiveEnergy } from './activity';
import { logCustomMeal } from './meals';
import { weekReadout, dayEnergyReadout } from './week';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('weekReadout', () => {
  it('returns the 7 days ending on the given date, oldest first', () => {
    const { db, user } = setup();
    const week = weekReadout(db, user.id, '2026-08-05', 1600);
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe('2026-07-30');
    expect(week[6].date).toBe('2026-08-05');
  });

  it('marks unlogged days and carries the eaten total on logged ones', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-08-05', 'lunch', 'Bowl', 700, 40);
    logCustomMeal(db, user.id, '2026-08-05', 'dinner', 'Plate', 500, 30);
    const week = weekReadout(db, user.id, '2026-08-05', 1600);
    expect(week[6]).toMatchObject({ logged: true, eatenKcal: 1200, remainingKcal: 400 });
    expect(week[5]).toMatchObject({ logged: false, eatenKcal: 0 });
  });

  it("credits a day's above-typical activity into that day's allowance", () => {
    const { db, user } = setup();
    // BMR fixed by an explicit logged reading well before the window.
    addBodyMetric(db, user.id, { date: '2026-07-01', weightKg: 90, bmrKcal: 1700 });
    // Four typical days at 400, then a 600 day: typical avg 400 → earned 200.
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']) {
      setActiveEnergy(db, user.id, { date: d, activeKcal: 400, source: 'shortcut' });
    }
    setActiveEnergy(db, user.id, { date: '2026-08-05', activeKcal: 600, source: 'shortcut' });
    logCustomMeal(db, user.id, '2026-08-05', 'lunch', 'Bowl', 1000, 40);

    const week = weekReadout(db, user.id, '2026-08-05', 1600);
    expect(week[6]).toMatchObject({
      earnedKcal: 200,
      allowanceKcal: 1800,
      remainingKcal: 800
    });
  });

  it('uses the Watch resting figure when the day has one', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-07-01', weightKg: 90, bmrKcal: 1700 });
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']) {
      setActiveEnergy(db, user.id, { date: d, activeKcal: 400, source: 'shortcut' });
    }
    // Watch rests 50 above BMR: earned = (1750 + 600) − (1700 + 400) = 250.
    setActiveEnergy(db, user.id, {
      date: '2026-08-05',
      activeKcal: 600,
      basalKcal: 1750,
      source: 'shortcut'
    });
    const week = weekReadout(db, user.id, '2026-08-05', 1600);
    expect(week[6].earnedKcal).toBe(250);
  });
});

describe('dayEnergyReadout', () => {
  it('exposes the burn breakdown behind the earn', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-07-01', weightKg: 90, bmrKcal: 1700 });
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']) {
      setActiveEnergy(db, user.id, { date: d, activeKcal: 400, source: 'shortcut' });
    }
    setActiveEnergy(db, user.id, {
      date: '2026-08-05',
      activeKcal: 600,
      basalKcal: 1750,
      source: 'shortcut'
    });
    const e = dayEnergyReadout(db, user.id, '2026-08-05');
    expect(e).toMatchObject({
      earnedKcal: 250,
      restingKcal: 1750,
      restingSource: 'watch',
      activeKcal: 600,
      todayBurnKcal: 2350,
      baselineKcal: 2100,
      typicalActiveKcal: 400
    });
  });

  it("does not let a day's own burn inflate its baseline", () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-07-01', weightKg: 90, bmrKcal: 1700 });
    for (const d of ['2026-08-01', '2026-08-02', '2026-08-03']) {
      setActiveEnergy(db, user.id, { date: d, activeKcal: 400, source: 'shortcut' });
    }
    setActiveEnergy(db, user.id, { date: '2026-08-05', activeKcal: 1000, source: 'shortcut' });
    // Typical is the three 400-days — the 1000 burn is excluded from its own baseline.
    expect(dayEnergyReadout(db, user.id, '2026-08-05').typicalActiveKcal).toBe(400);
  });
});
