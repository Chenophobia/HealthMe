import { describe, it, expect } from 'vitest';
import {
  energyBalance,
  bmrOnOrBefore,
  deficitSummary,
  weightChangeBetween,
  ageOn,
  mifflinStJeor,
  resolveBmr,
  goalPace,
  typicalActive,
  goalIntake,
  carriedShortfall,
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

describe('ageOn', () => {
  it('counts whole years', () => {
    expect(ageOn('1997-02-28', '2026-08-03')).toBe(29);
  });

  it('turns over on the birthday, not before it', () => {
    expect(ageOn('1997-02-28', '2026-02-27')).toBe(28);
    expect(ageOn('1997-02-28', '2026-02-28')).toBe(29);
  });

  it('rejects a malformed or impossible date', () => {
    expect(ageOn('28-02-1997', '2026-08-03')).toBeNull();
    expect(ageOn('1997-02-28', 'today')).toBeNull();
    expect(ageOn('2027-01-01', '2026-08-03')).toBeNull(); // born in the future
  });
});

describe('mifflinStJeor', () => {
  it('computes the male form', () => {
    // 10(79.9) + 6.25(169) - 5(29) + 5
    expect(mifflinStJeor({ weightKg: 79.9, heightCm: 169, ageYears: 29, sex: 'male' })).toBe(1715);
  });

  it('computes the female form, 166 kcal lower for the same body', () => {
    const male = mifflinStJeor({ weightKg: 79.9, heightCm: 169, ageYears: 29, sex: 'male' })!;
    const female = mifflinStJeor({ weightKg: 79.9, heightCm: 169, ageYears: 29, sex: 'female' })!;
    expect(male - female).toBe(166);
  });

  it('falls by 10 kcal per kilo lost, which is the point of computing it', () => {
    const before = mifflinStJeor({ weightKg: 80, heightCm: 169, ageYears: 29, sex: 'male' })!;
    const after = mifflinStJeor({ weightKg: 75, heightCm: 169, ageYears: 29, sex: 'male' })!;
    expect(before - after).toBe(50);
  });

  it('is null for out-of-range or unsupported input', () => {
    expect(mifflinStJeor({ weightKg: 0, heightCm: 169, ageYears: 29, sex: 'male' })).toBeNull();
    expect(mifflinStJeor({ weightKg: 80, heightCm: 10, ageYears: 29, sex: 'male' })).toBeNull();
    expect(
      mifflinStJeor({ weightKg: 80, heightCm: 169, ageYears: 29, sex: 'other' as 'male' })
    ).toBeNull();
  });
});

describe('resolveBmr', () => {
  const profile = { heightCm: 169, birthDate: '1997-02-28', sex: 'male' };
  const metrics = [
    { date: '2026-07-01', weightKg: 84.0, bmrKcal: 1850 },
    { date: '2026-08-03', weightKg: 79.9, bmrKcal: null }
  ];

  it('computes from the latest weight when the day has no logged reading', () => {
    expect(resolveBmr('2026-08-03', metrics, profile)).toEqual({ kcal: 1715, source: 'computed' });
  });

  it('prefers a reading logged on the day itself — an explicit override', () => {
    expect(resolveBmr('2026-07-01', metrics, profile)).toEqual({ kcal: 1850, source: 'logged' });
  });

  it('does not carry a stale reading ahead of a fresh computation', () => {
    // The 2026-07-01 reading of 1850 must not win on 2026-08-03, where the
    // formula has a current weight to work from.
    expect(resolveBmr('2026-08-03', metrics, profile)?.kcal).toBe(1715);
  });

  it('falls back to carrying a logged reading forward when the profile is unset', () => {
    const bare = { heightCm: null, birthDate: null, sex: null };
    expect(resolveBmr('2026-08-03', metrics, bare)).toEqual({ kcal: 1850, source: 'logged' });
  });

  it('is null before the first weigh-in, with nothing to compute from', () => {
    expect(resolveBmr('2026-06-01', metrics, profile)).toBeNull();
  });

  it('is null when neither a profile nor a logged reading exists', () => {
    const bare = { heightCm: null, birthDate: null, sex: null };
    const noBmr = [{ date: '2026-08-03', weightKg: 79.9, bmrKcal: null }];
    expect(resolveBmr('2026-08-03', noBmr, bare)).toBeNull();
  });
});

describe('goalPace', () => {
  const base = { currentKg: 79.9, goalKg: 76.0, today: '2026-08-03', goalDate: '2026-09-08' };

  it('spreads the required loss across the days remaining', () => {
    const p = goalPace(base)!;
    expect(p.days).toBe(36);
    expect(p.kgToGo).toBeCloseTo(3.9);
    expect(Math.round(p.totalKcal)).toBe(30030);
    expect(Math.round(p.perDayKcal)).toBe(834);
    expect(p.reached).toBe(false);
  });

  it('reports a goal already met rather than a negative pace', () => {
    const p = goalPace({ ...base, currentKg: 75.0 })!;
    expect(p.reached).toBe(true);
    expect(p.perDayKcal).toBe(0);
  });

  it('flags a date that has gone by', () => {
    const p = goalPace({ ...base, today: '2026-09-20' })!;
    expect(p.expired).toBe(true);
  });

  it('never divides by zero days on the target date itself', () => {
    const p = goalPace({ ...base, today: '2026-09-08' })!;
    expect(p.days).toBe(1);
    expect(Number.isFinite(p.perDayKcal)).toBe(true);
  });

  it('is null for nonsense input', () => {
    expect(goalPace({ ...base, goalDate: 'soon' })).toBeNull();
    expect(goalPace({ ...base, currentKg: 0 })).toBeNull();
  });
});

describe('typicalActive', () => {
  const day = (date: string, activeKcal: number) => ({ date, activeKcal });

  it('averages the recent window', () => {
    expect(
      typicalActive([day('2026-08-01', 300), day('2026-08-02', 400), day('2026-08-03', 500)])
    ).toBe(400);
  });

  it('withholds a figure until there is enough to average', () => {
    expect(typicalActive([day('2026-08-01', 300), day('2026-08-02', 400)])).toBeNull();
    expect(typicalActive([])).toBeNull();
  });

  it('only looks at the window, not all history', () => {
    const days = Array.from({ length: 30 }, (_, i) =>
      day(`2026-07-${String(i + 1).padStart(2, '0')}`, i < 16 ? 1000 : 200)
    );
    expect(typicalActive(days, 14)).toBe(200);
  });
});

describe('goalIntake', () => {
  it('works intake back from burn and the required deficit', () => {
    const r = goalIntake({
      bmrKcal: 1715,
      typicalActiveKcal: 900,
      requiredDeficitKcal: 500,
      floorKcal: 1600
    })!;
    expect(r.rawKcal).toBe(2115);
    expect(r.intakeKcal).toBe(2115);
    expect(r.floored).toBe(false);
    expect(r.deficitAtIntake).toBe(500);
  });

  it('holds the floor when the pace demands less food than it allows', () => {
    const r = goalIntake({
      bmrKcal: 1715,
      typicalActiveKcal: 400,
      requiredDeficitKcal: 834,
      floorKcal: 1600
    })!;
    expect(r.rawKcal).toBe(1281); // what the pace wanted
    expect(r.intakeKcal).toBe(1600); // what it will actually say
    expect(r.floored).toBe(true);
    // And the honest consequence: the floor delivers less than the goal needs.
    expect(r.deficitAtIntake).toBe(515);
    expect(r.deficitAtIntake).toBeLessThan(834);
  });

  it('never returns an intake below the floor, however severe the pace', () => {
    const r = goalIntake({
      bmrKcal: 1500,
      typicalActiveKcal: 0,
      requiredDeficitKcal: 5000,
      floorKcal: 1600
    })!;
    expect(r.intakeKcal).toBe(1600);
    expect(r.floored).toBe(true);
  });

  it('treats unknown activity as none rather than guessing', () => {
    const r = goalIntake({
      bmrKcal: 1715,
      typicalActiveKcal: null,
      requiredDeficitKcal: 100,
      floorKcal: 1600
    })!;
    expect(r.rawKcal).toBe(1615);
  });

  it('is null without a resting figure to build on', () => {
    expect(
      goalIntake({
        bmrKcal: null,
        typicalActiveKcal: 400,
        requiredDeficitKcal: 500,
        floorKcal: 1600
      })
    ).toBeNull();
  });
});

describe('carriedShortfall', () => {
  it('adds up how far short of the pace a run of days fell', () => {
    const c = carriedShortfall(834, [
      { date: '2026-08-01', deficitKcal: 500 }, // 334 short
      { date: '2026-08-02', deficitKcal: 600 } // 234 short
    ])!;
    expect(c.days).toBe(2);
    expect(c.kcal).toBe(568);
  });

  it('goes negative when the days beat the pace', () => {
    const c = carriedShortfall(500, [
      { date: '2026-08-01', deficitKcal: 800 },
      { date: '2026-08-02', deficitKcal: 700 }
    ])!;
    expect(c.kcal).toBe(-500);
  });

  it('nets a good day against a bad one', () => {
    const c = carriedShortfall(500, [
      { date: '2026-08-01', deficitKcal: 200 }, // 300 short
      { date: '2026-08-02', deficitKcal: 800 } // 300 over
    ])!;
    expect(c.kcal).toBe(0);
  });

  it('skips days it cannot price rather than scoring them as zero deficit', () => {
    const c = carriedShortfall(834, [
      { date: '2026-08-01', deficitKcal: null },
      { date: '2026-08-02', deficitKcal: 834 }
    ])!;
    expect(c.days).toBe(1);
    expect(c.kcal).toBe(0);
  });

  it('is null when there is nothing complete to carry', () => {
    expect(carriedShortfall(834, [])).toBeNull();
    expect(carriedShortfall(834, [{ date: '2026-08-01', deficitKcal: null }])).toBeNull();
  });
});
