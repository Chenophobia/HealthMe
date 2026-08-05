import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { setActiveEnergy, activeEnergyForDate, listActiveEnergy } from './activity';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('setActiveEnergy', () => {
  it('stores a day and reads it back', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 542, source: 'shortcut' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')).toMatchObject({
      activeKcal: 542,
      source: 'shortcut'
    });
  });

  it('overwrites the day rather than accumulating — the Shortcut posts a running total', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 300, source: 'shortcut' });
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 640, source: 'shortcut' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')?.activeKcal).toBe(640);
    expect(listActiveEnergy(db, user.id)).toHaveLength(1);
  });

  it('lets a manual correction replace the automated figure', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 900, source: 'shortcut' });
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 400, source: 'manual' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')).toMatchObject({
      activeKcal: 400,
      source: 'manual'
    });
  });

  it('keeps days apart', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-02', activeKcal: 100, source: 'manual' });
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 200, source: 'manual' });
    expect(listActiveEnergy(db, user.id)).toEqual([
      { date: '2026-08-02', activeKcal: 100, basalKcal: null },
      { date: '2026-08-03', activeKcal: 200, basalKcal: null }
    ]);
  });

  it('rounds to whole kcal', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 542.6, source: 'shortcut' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')?.activeKcal).toBe(543);
  });

  it('accepts a genuine zero', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 0, source: 'shortcut' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')?.activeKcal).toBe(0);
  });

  it('refuses negatives, nonsense, and a kJ/kcal mix-up', () => {
    const { db, user } = setup();
    const bad = (activeKcal: number) =>
      setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal, source: 'shortcut' });
    expect(() => bad(-1)).toThrow();
    expect(() => bad(Number.NaN)).toThrow();
    expect(() => bad(50_000)).toThrow(/units/);
  });

  it('is null for a day nothing arrived for', () => {
    const { db, user } = setup();
    expect(activeEnergyForDate(db, user.id, '2026-08-03')).toBeNull();
  });

  it('stores resting energy alongside active when the Shortcut sends it', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, {
      date: '2026-08-03',
      activeKcal: 542,
      basalKcal: 1710.4,
      source: 'shortcut'
    });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')).toMatchObject({
      activeKcal: 542,
      basalKcal: 1710
    });
    expect(listActiveEnergy(db, user.id)).toEqual([
      { date: '2026-08-03', activeKcal: 542, basalKcal: 1710 }
    ]);
  });

  it('reads resting energy back as null when it never arrived', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 542, source: 'shortcut' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')?.basalKcal).toBeNull();
  });

  it('an active-only re-post clears a stale resting figure — the write is the whole day', () => {
    const { db, user } = setup();
    setActiveEnergy(db, user.id, {
      date: '2026-08-03',
      activeKcal: 300,
      basalKcal: 900,
      source: 'shortcut'
    });
    setActiveEnergy(db, user.id, { date: '2026-08-03', activeKcal: 640, source: 'shortcut' });
    expect(activeEnergyForDate(db, user.id, '2026-08-03')).toMatchObject({
      activeKcal: 640,
      basalKcal: null
    });
  });

  it('refuses a negative or kJ-sized resting figure', () => {
    const { db, user } = setup();
    const bad = (basalKcal: number) =>
      setActiveEnergy(db, user.id, {
        date: '2026-08-03',
        activeKcal: 100,
        basalKcal,
        source: 'shortcut'
      });
    expect(() => bad(-1)).toThrow();
    expect(() => bad(50_000)).toThrow(/units/);
  });
});
