/*
 * Foods are logged by quantity, so every figure on screen is the food's stored
 * nutrition scaled to what you actually ate.
 *
 * Nutrition is held per `baseQty` rather than per single unit so weights and
 * countable things share one shape: chicken is 165 kcal per 100 g, a banana is
 * 105 kcal per 1. Scaling is the same arithmetic either way.
 */

export type FoodUnit = 'g' | 'ml' | 'item';
export const FOOD_UNITS: FoodUnit[] = ['g', 'ml', 'item'];

/** What `baseQty` defaults to for a unit — 100 g/ml, or a single item. */
export function baseQuantityFor(unit: FoodUnit): number {
  return unit === 'item' ? 1 : 100;
}

export type FoodNutrition = { baseQty: number; kcal: number; proteinG: number };

/**
 * Nutrition for an arbitrary quantity. Null for anything that would produce a
 * meaningless row — a zero portion, or a food whose base quantity is unusable.
 */
export function scaleFood(
  food: FoodNutrition,
  quantity: number
): { kcal: number; proteinG: number } | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (!Number.isFinite(food.baseQty) || food.baseQty <= 0) return null;

  const factor = quantity / food.baseQty;
  return {
    kcal: Math.round(food.kcal * factor),
    proteinG: Math.round(food.proteinG * factor)
  };
}

/** `200 g`, `1 item`, `2 items` — trailing zeros trimmed off the number. */
export function formatQuantity(quantity: number, unit: FoodUnit): string {
  const n = Number.isFinite(quantity) ? Math.round(quantity * 10) / 10 : 0;
  const text = String(n);
  if (unit === 'item') return `${text} ${n === 1 ? 'item' : 'items'}`;
  return `${text} ${unit}`;
}

/**
 * Every whitespace-separated part of the query has to appear somewhere in the
 * name. That makes "chick br" find "Chicken breast" without the parts having
 * to be adjacent or in order, which is how people actually type into a search
 * box they're using one-handed.
 */
export function matchesQuery(name: string, query: string): boolean {
  const parts = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return true;
  const haystack = name.toLowerCase();
  return parts.every((part) => haystack.includes(part));
}

export type SearchableFood = { id: number; name: string };

/**
 * Filters and orders matches: names that *start* with the query come first,
 * since typing "ban" almost always means Banana rather than Plantain banana.
 */
export function searchFoods<T extends SearchableFood>(foods: T[], query: string, limit = 8): T[] {
  const trimmed = query.trim();
  const matches = foods.filter((f) => matchesQuery(f.name, trimmed));
  const lower = trimmed.toLowerCase();

  return matches
    .slice()
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lower);
      const bStarts = b.name.toLowerCase().startsWith(lower);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
