import { describe, it, expect } from 'vitest';
import { todayLocal, weekdayOf, scheduledSessionFor, isValidDate, shiftDate } from './dates';

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

describe('scheduledSessionFor', () => {
  it('maps Mon/Wed/Fri to push/pull/legs and rest days to null', () => {
    expect(scheduledSessionFor('2026-08-03')).toBe('push'); // Monday
    expect(scheduledSessionFor('2026-08-05')).toBe('pull'); // Wednesday
    expect(scheduledSessionFor('2026-08-07')).toBe('legs'); // Friday
    expect(scheduledSessionFor('2026-08-02')).toBeNull(); // Sunday
  });
});

describe('isValidDate', () => {
  it('accepts a real date', () => {
    expect(isValidDate('2026-08-02')).toBe(true);
  });
  it('rejects wrong shapes', () => {
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('2026-8-2')).toBe(false);
    expect(isValidDate('02-08-2026')).toBe(false);
    expect(isValidDate('2026-08-02T00:00:00')).toBe(false);
  });
  it('rejects impossible calendar dates', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2025-02-29')).toBe(false); // 2025 is not a leap year
  });
  it('accepts a leap day in a leap year', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
  });
});

describe('shiftDate', () => {
  it('shifts forward across a month boundary', () => {
    expect(shiftDate('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('shifts backward across a month boundary', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('zero days is identity', () => {
    expect(shiftDate('2026-08-02', 0)).toBe('2026-08-02');
  });
});
