import { describe, it, expect } from 'vitest';
import { earnedEnergy, dayBudget } from './budget';

describe('earnedEnergy', () => {
  it('credits burn above the baseline when the Watch sent both figures', () => {
    // Watch says rest 1750 + active 600 = 2350; the budget assumed 1700 + 400.
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: 1750,
      activeKcal: 600,
      typicalActiveKcal: 400
    });
    expect(e.earnedKcal).toBe(250);
    expect(e.todayBurnKcal).toBe(2350);
    expect(e.baselineKcal).toBe(2100);
    expect(e.restingSource).toBe('watch');
  });

  it('falls back to BMR for resting, so only above-typical activity earns', () => {
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: null,
      activeKcal: 600,
      typicalActiveKcal: 400
    });
    expect(e.earnedKcal).toBe(200);
    expect(e.restingSource).toBe('bmr');
  });

  it('never goes negative — a lazy day earns nothing, it does not shrink the budget', () => {
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: 1600,
      activeKcal: 100,
      typicalActiveKcal: 400
    });
    expect(e.earnedKcal).toBe(0);
  });

  it('with no activity history the budget assumed none, so all active burn counts', () => {
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: null,
      activeKcal: 600,
      typicalActiveKcal: null
    });
    expect(e.earnedKcal).toBe(600);
    expect(e.typicalActiveKcal).toBe(0);
  });

  it('still works without a BMR — resting cancels out of both sides', () => {
    const e = earnedEnergy({
      bmrKcal: null,
      basalKcal: null,
      activeKcal: 600,
      typicalActiveKcal: 400
    });
    expect(e.earnedKcal).toBe(200);
    // But the burn breakdown is honest about not knowing resting burn.
    expect(e.restingKcal).toBeNull();
    expect(e.todayBurnKcal).toBeNull();
    expect(e.baselineKcal).toBeNull();
    expect(e.restingSource).toBeNull();
  });

  it('earns nothing when no activity arrived at all', () => {
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: null,
      activeKcal: null,
      typicalActiveKcal: 400
    });
    expect(e.earnedKcal).toBe(0);
    expect(e.hasActive).toBe(false);
  });

  it('a Watch resting figure above BMR earns even without active energy', () => {
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: 1900,
      activeKcal: null,
      typicalActiveKcal: null
    });
    expect(e.earnedKcal).toBe(200);
  });

  it('rounds to whole kcal', () => {
    const e = earnedEnergy({
      bmrKcal: 1700,
      basalKcal: null,
      activeKcal: 600.6,
      typicalActiveKcal: 400.2
    });
    expect(Number.isInteger(e.earnedKcal)).toBe(true);
  });
});

describe('dayBudget', () => {
  it('remaining = budget + earned − eaten', () => {
    const b = dayBudget({ budgetKcal: 1600, earnedKcal: 180, eatenKcal: 1240 });
    expect(b).toEqual({
      budgetKcal: 1600,
      earnedKcal: 180,
      allowanceKcal: 1780,
      eatenKcal: 1240,
      remainingKcal: 540
    });
  });

  it('goes negative when the allowance is breached — "over" is a real state', () => {
    const b = dayBudget({ budgetKcal: 1600, earnedKcal: 0, eatenKcal: 1900 });
    expect(b.remainingKcal).toBe(-300);
  });
});
