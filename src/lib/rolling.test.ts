import { describe, it, expect } from 'vitest';
import { rollingAverage } from './rolling';

describe('rollingAverage', () => {
  it('averages the trailing window per point', () => {
    const pts = [
      { date: '2026-08-01', value: 80 },
      { date: '2026-08-02', value: 79 },
      { date: '2026-08-08', value: 78 } // 01 falls outside its 7-day window
    ];
    const avg = rollingAverage(pts, 7);
    expect(avg[0].value).toBeCloseTo(80);
    expect(avg[1].value).toBeCloseTo(79.5);
    expect(avg[2].value).toBeCloseTo(78.5); // (79 + 78) / 2
  });

  it('is empty for no points', () => {
    expect(rollingAverage([], 7)).toEqual([]);
  });
});
