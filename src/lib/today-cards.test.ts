import { describe, it, expect } from 'vitest';
import { TODAY_CARDS, normalizeTodayOrder } from './today-cards';

describe('normalizeTodayOrder', () => {
  it('null means the default order', () => {
    expect(normalizeTodayOrder(null)).toEqual(TODAY_CARDS);
  });

  it('keeps a full valid order as given', () => {
    expect(normalizeTodayOrder('trend,goal,week,session,body,weighin')).toEqual([
      'trend',
      'goal',
      'week',
      'session',
      'body',
      'weighin'
    ]);
  });

  it('drops unknown keys and appends missing ones in default order', () => {
    // A stale value from before a redesign must not lose cards or crash.
    expect(normalizeTodayOrder('goal,ring,nonsense,trend')).toEqual([
      'goal',
      'trend',
      'week',
      'session',
      'weighin',
      'body'
    ]);
  });

  it('ignores duplicates, whitespace, and empty segments', () => {
    expect(normalizeTodayOrder(' goal , goal ,, week ')).toEqual([
      'goal',
      'week',
      'session',
      'weighin',
      'body',
      'trend'
    ]);
  });
});
