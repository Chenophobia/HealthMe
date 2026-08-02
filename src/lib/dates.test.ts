import { describe, it, expect } from 'vitest';
import { todayLocal, weekdayOf } from './dates';

describe('todayLocal', () => {
  it('formats a fixed date as YYYY-MM-DD', () => {
    expect(todayLocal(new Date(2026, 7, 2, 9, 30))).toBe('2026-08-02');
  });
  it('pads single-digit month and day', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('weekdayOf', () => {
  it('names the weekday', () => {
    expect(weekdayOf('2026-08-03')).toBe('Monday');
    expect(weekdayOf('2026-08-07')).toBe('Friday');
  });
});
