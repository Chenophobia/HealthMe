import { describe, it, expect } from 'vitest';
import {
  energyBalance,
  bmrOnOrBefore,
  deficitSummary,
  weightChangeBetween,
  KCAL_PER_KG_FAT
} from './energy';

describe('energyBalance', () => {
  it('adds active energy to BMR and subtracts what was eaten', () => {
    const b = energyBalance({ bmrKcal: 1780, activeKcal: 420, eatenKcal: 1740 });
    expect(b.burnedKcal).toBe(2200);
    expect(b.deficitKcal).toBe(460);
    expect(b.status).toBe('deficit');
  });

  it('reads a surplus when intake beats burn', () => {
    const b = energyBalance({ bmrKcal: 1500, activeKcal: 100, eatenKcal: 2400 });
    expect(b.deficitKcal).toBe(-800);
    expect(b.status).toBe('surplus');
  });

  it('reports nothing without a BMR, rather than treating resting burn as zero', () => {
    const b = energyBalance({ bmrKcal: null, activeKcal: 500, eatenKcal: 1800 });
    expect(b.burnedKcal).toBeNull();
    expect(b.deficitKcal).toBeNull();
    expect(b.status).toBe('unknown');
  });

  it('treats missing active energy as zero but flags that it is missing', () => {
    const b = energyBalance({ bmrKcal: 1800, activeKcal: null, eatenKcal: 1500 });
    expect(b.activeKcal).toBe(0);
    expect(b.hasActive).toBe(false);
    expect(b.deficitKcal).toBe(300);
  });

  it('withholds a figure before anything is eaten, rather than booking all of burn as a deficit', () => {
    const b = energyBalance({ bmrKcal: 1800, activeKcal: 300, eatenKcal: 0 });
    expect(b.status).toBe('pending');
    // The arithmetic still stands — it's the headline that would mislead at 8am.
    expect(b.burnedKcal).toBe(2100);
    expect(b.deficitKcal).toBe(2100);
  });

  it('distinguishes a real zero from no reading at all', () => {
    const b = energyBalance({ bmrKcal: 1800, activeKcal: 0, eatenKcal: 1500 });
    expect(b.hasActive).toBe(true);
    expect(b.deficitKcal).toBe(300);
  });

  it('ignores negative and non-finite readings', () => {
    expect(energyBalance({ bmrKcal: -5, activeKcal: 100, eatenKcal: 1000 }).status).toBe('unknown');
    expect(
      energyBalance({ bmrKcal: 1800, activeKcal: Number.NaN, eatenKcal: 1000 }).activeKcal
    ).toBe(0);
  });
});

describe('bmrOnOrBefore', () => {
  const metrics = [
    { date: '2026-07-01', bmrKcal: 1820 },
    { date: '2026-07-15', bmrKcal: null },
    { date: '2026-07-20', bmrKcal: 1790 }
  ];

  it('carries the most recent reading forward across days with none', () => {
    expect(bmrOnOrBefore(metrics, '2026-07-25')).toBe(1790);
    expect(bmrOnOrBefore(metrics, '2026-07-16')).toBe(1820);
  });

  it('uses the reading from the day itself when there is one', () => {
    expect(bmrOnOrBefore(metrics, '2026-07-20')).toBe(1790);
  });

  it('never looks forward in time', () => {
    expect(bmrOnOrBefore(metrics, '2026-06-30')).toBeNull();
  });

  it('is null when nothing has ever been logged', () => {
    expect(bmrOnOrBefore([], '2026-07-25')).toBeNull();
    expect(bmrOnOrBefore([{ date: '2026-07-01', bmrKcal: null }], '2026-07-25')).toBeNull();
  });
});

describe('deficitSummary', () => {
  it('averages only the days it can actually compute', () => {
    const s = deficitSummary([
      { date: '2026-07-01', deficitKcal: 500 },
      { date: '2026-07-02', deficitKcal: null }, // no BMR that far back
      { date: '2026-07-03', deficitKcal: 300 }
    ])!;
    expect(s.days).toBe(2);
    expect(s.totalKcal).toBe(800);
    expect(s.averageKcal).toBe(400);
  });

  it('converts the total to a signed weight change', () => {
    const s = deficitSummary([{ date: '2026-07-01', deficitKcal: KCAL_PER_KG_FAT }])!;
    expect(s.projectedChangeKg).toBeCloseTo(-1);
  });

  it('is null when no day is complete', () => {
    expect(deficitSummary([{ date: '2026-07-01', deficitKcal: null }])).toBeNull();
    expect(deficitSummary([])).toBeNull();
  });
});

describe('weightChangeBetween', () => {
  const metrics = [
    { date: '2026-07-01', weightKg: 88.0 },
    { date: '2026-07-15', weightKg: 86.5 },
    { date: '2026-08-01', weightKg: 85.2 }
  ];

  it('differences the ends of the window', () => {
    expect(weightChangeBetween(metrics, '2026-07-01', '2026-08-01')).toBeCloseTo(-2.8);
    expect(weightChangeBetween(metrics, '2026-07-01', '2026-07-15')).toBeCloseTo(-1.5);
  });

  it('needs two weigh-ins inside the window', () => {
    expect(weightChangeBetween(metrics, '2026-07-02', '2026-07-14')).toBeNull();
    expect(weightChangeBetween([], '2026-07-01', '2026-08-01')).toBeNull();
  });
});
