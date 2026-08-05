/*
 * The Today page's movable cards. The ring is not here — it is the page's
 * reason to exist and stays pinned on top; everything below it can be
 * reordered to taste and the order is saved with the profile.
 */

export const TODAY_CARDS = ['week', 'goal', 'session', 'weighin', 'body', 'trend'] as const;

export type TodayCard = (typeof TODAY_CARDS)[number];

export const CARD_LABELS: Record<TodayCard, string> = {
  week: 'Last 7 days',
  goal: 'Goal',
  session: 'Session',
  weighin: 'Weigh-in',
  body: 'Body profile',
  trend: 'Weight trend'
};

/**
 * A stored order back into a complete one: unknown keys are dropped, missing
 * ones appended in default order. Whatever was saved, every card renders
 * exactly once.
 */
export function normalizeTodayOrder(stored: string | null): TodayCard[] {
  const known = new Set<string>(TODAY_CARDS);
  const seen = new Set<TodayCard>();
  const order: TodayCard[] = [];
  for (const raw of (stored ?? '').split(',')) {
    const key = raw.trim() as TodayCard;
    if (known.has(key) && !seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }
  for (const key of TODAY_CARDS) if (!seen.has(key)) order.push(key);
  return order;
}
