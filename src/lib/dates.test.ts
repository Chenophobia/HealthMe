import { describe, it, expect } from 'vitest';
import { todayLocal, weekdayOf, scheduledSessionFor } from './dates';

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
