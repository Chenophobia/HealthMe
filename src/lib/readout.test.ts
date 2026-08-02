import { describe, it, expect } from 'vitest';
import { gauge, formatNumber, formatSigned, gaugeCaption } from './readout';

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

describe('gaugeCaption', () => {
  it('counts a ceiling down, then reports the overage', () => {
    expect(gaugeCaption(gauge(1140, 1750), 'kcal')).toBe('1,140 of 1,750 kcal logged.');
    expect(gaugeCaption(gauge(2000, 1750), 'kcal')).toBe('250 kcal over budget.');
  });

  it('counts a floor up, then confirms it is cleared', () => {
    expect(gaugeCaption(gauge(111, 150, 'floor', 160), 'g', 'floor')).toBe('39 g to go.');
    expect(gaugeCaption(gauge(155, 150, 'floor', 160), 'g', 'floor')).toBe(
      'Floor cleared — 155 g logged.'
    );
  });
});
