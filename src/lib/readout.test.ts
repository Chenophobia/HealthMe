import { describe, it, expect } from 'vitest';
import { gauge, formatNumber, formatSigned, gaugeHeadline, toneFor } from './readout';

describe('gauge — ceiling (calories)', () => {
  it('fills proportionally and reports what is left', () => {
    const g = gauge(1140, 1750);
    expect(g.fraction).toBeCloseTo(1140 / 1750);
    expect(g.remaining).toBe(610);
    expect(g.status).toBe('progress');
  });

  it('counts landing within 5% of the target as met, not over', () => {
    expect(gauge(1700, 1750).status).toBe('met');
    expect(gauge(1800, 1750).status).toBe('met');
  });

  it('reads over only past the tolerance, and goes negative', () => {
    const g = gauge(2000, 1750);
    expect(g.status).toBe('over');
    expect(g.remaining).toBe(-250);
  });

  it('clamps the bar at full rather than overflowing it', () => {
    expect(gauge(3000, 1750).fraction).toBe(1);
  });

  it('is empty before anything is logged', () => {
    expect(gauge(0, 1750).status).toBe('empty');
  });

  it('warns once the room left is running out, before the target is hit', () => {
    expect(gauge(1400, 1750).status).toBe('progress'); // 80%
    expect(gauge(1500, 1750).status).toBe('near'); // 86%
    expect(gauge(1660, 1750).status).toBe('near'); // 94.9% — still short of met
    expect(gauge(1670, 1750).status).toBe('met'); // 95.4%
  });
});

describe('toneFor', () => {
  it('maps each status to the band it paints in', () => {
    expect(toneFor('empty')).toBe('muted');
    expect(toneFor('progress')).toBe('accent');
    expect(toneFor('near')).toBe('warn');
    expect(toneFor('met')).toBe('good');
    expect(toneFor('over')).toBe('over');
  });
});

describe('gauge — floor (protein)', () => {
  it('scales the bar to the aim and keeps the target as the notch', () => {
    const g = gauge(111, 150, 'floor', 160);
    expect(g.scale).toBe(160);
    expect(g.target).toBe(150);
    expect(g.fraction).toBeCloseTo(111 / 160);
    expect(g.status).toBe('progress');
  });

  it('is met at the floor, and never reads over', () => {
    expect(gauge(150, 150, 'floor', 160).status).toBe('met');
    expect(gauge(200, 150, 'floor', 160).status).toBe('met');
  });

  it('falls back to the target when no aim is given', () => {
    expect(gauge(120, 150, 'floor').scale).toBe(150);
  });
});

describe('gauge — bad input', () => {
  it('treats a negative or non-finite log as nothing logged', () => {
    expect(gauge(-50, 1750).logged).toBe(0);
    expect(gauge(Number.NaN, 1750).logged).toBe(0);
  });

  it('never divides by a zero target', () => {
    expect(gauge(100, 0).fraction).toBe(1);
    expect(Number.isFinite(gauge(100, 0).fraction)).toBe(true);
  });
});

describe('formatNumber', () => {
  it('groups thousands and drops decimals', () => {
    expect(formatNumber(1750)).toBe('1,750');
    expect(formatNumber(610.4)).toBe('610');
  });

  it('renders a dash for a non-number', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
  });
});

describe('formatSigned', () => {
  it('keeps the direction explicit', () => {
    expect(formatSigned(-3.3)).toBe('-3.3');
    expect(formatSigned(1.25)).toBe('+1.3');
    expect(formatSigned(0)).toBe('0.0');
  });
});

describe('gaugeHeadline', () => {
  it('counts a ceiling down, then flips to the overage', () => {
    expect(gaugeHeadline(gauge(1140, 1750), 'kcal')).toEqual({
      value: '610',
      suffix: 'kcal left'
    });
    expect(gaugeHeadline(gauge(2000, 1750), 'kcal')).toEqual({
      value: '250',
      suffix: 'kcal over'
    });
  });

  it('counts a floor up, then reports the total once cleared', () => {
    expect(gaugeHeadline(gauge(111, 150, 'floor', 160), 'g', 'floor')).toEqual({
      value: '39',
      suffix: 'g to go'
    });
    expect(gaugeHeadline(gauge(155, 150, 'floor', 160), 'g', 'floor')).toEqual({
      value: '155',
      suffix: 'g logged'
    });
  });

  it('never shows a negative amount left', () => {
    expect(gaugeHeadline(gauge(0, 1750), 'kcal').value).toBe('1,750');
    expect(gaugeHeadline(gauge(200, 150, 'floor'), 'g', 'floor').value).toBe('200');
  });
});
