import { describe, it, expect } from 'vitest';
import { scaleFood, formatQuantity, matchesQuery, searchFoods, baseQuantityFor } from './foods';

const chicken = { baseQty: 100, kcal: 165, proteinG: 31 };
const banana = { baseQty: 1, kcal: 105, proteinG: 1.3 };

describe('scaleFood', () => {
  it('scales a weight up and down from its per-100 figures', () => {
    expect(scaleFood(chicken, 200)).toEqual({ kcal: 330, proteinG: 62 });
    expect(scaleFood(chicken, 50)).toEqual({ kcal: 83, proteinG: 16 });
    expect(scaleFood(chicken, 100)).toEqual({ kcal: 165, proteinG: 31 });
  });

  it('handles per-item foods, including fractions of one', () => {
    expect(scaleFood(banana, 2)).toEqual({ kcal: 210, proteinG: 3 });
    expect(scaleFood(banana, 0.5)).toEqual({ kcal: 53, proteinG: 1 });
  });

  it('refuses portions that would log a meaningless row', () => {
    expect(scaleFood(chicken, 0)).toBeNull();
    expect(scaleFood(chicken, -50)).toBeNull();
    expect(scaleFood(chicken, Number.NaN)).toBeNull();
  });

  it('refuses a food whose base quantity is unusable', () => {
    expect(scaleFood({ baseQty: 0, kcal: 100, proteinG: 5 }, 50)).toBeNull();
  });
});

describe('baseQuantityFor', () => {
  it('is 100 for measured units and 1 for counted ones', () => {
    expect(baseQuantityFor('g')).toBe(100);
    expect(baseQuantityFor('ml')).toBe(100);
    expect(baseQuantityFor('item')).toBe(1);
  });
});

describe('formatQuantity', () => {
  it('writes weights with their unit', () => {
    expect(formatQuantity(200, 'g')).toBe('200 g');
    expect(formatQuantity(250, 'ml')).toBe('250 ml');
  });

  it('pluralises counted things', () => {
    expect(formatQuantity(1, 'item')).toBe('1 item');
    expect(formatQuantity(2, 'item')).toBe('2 items');
  });

  it('trims pointless decimals', () => {
    expect(formatQuantity(200.0, 'g')).toBe('200 g');
    expect(formatQuantity(37.55, 'g')).toBe('37.6 g');
  });
});

describe('matchesQuery', () => {
  it('matches on any order of parts, not just a prefix', () => {
    expect(matchesQuery('Chicken breast', 'chick br')).toBe(true);
    expect(matchesQuery('Chicken breast', 'breast chicken')).toBe(true);
    expect(matchesQuery('Chicken breast', 'CHICKEN')).toBe(true);
  });

  it('needs every part to appear', () => {
    expect(matchesQuery('Chicken breast', 'chicken thigh')).toBe(false);
  });

  it('matches everything on an empty query', () => {
    expect(matchesQuery('Chicken breast', '   ')).toBe(true);
  });
});

describe('searchFoods', () => {
  const foods = [
    { id: 1, name: 'Plantain banana' },
    { id: 2, name: 'Banana, medium' },
    { id: 3, name: 'Banana bread' },
    { id: 4, name: 'Chicken breast' }
  ];

  it('puts names that start with the query ahead of ones that merely contain it', () => {
    const ids = searchFoods(foods, 'ban').map((f) => f.id);
    // Both "Banana …" entries lead; "Plantain banana" only contains the query.
    expect(ids.slice(0, 2).sort()).toEqual([2, 3]);
    expect(ids.at(-1)).toBe(1);
  });

  it('breaks ties between equal-prefix matches alphabetically, contains-matches last', () => {
    // "Banana bread" and "Banana, medium" both lead; "Plantain banana" only
    // contains the word, so it sorts behind both.
    expect(searchFoods(foods, 'banana').map((f) => f.id)).toEqual([3, 2, 1]);
  });

  it('filters out what does not match', () => {
    expect(searchFoods(foods, 'chicken').map((f) => f.id)).toEqual([4]);
  });

  it('caps the list so the dropdown stays usable', () => {
    expect(searchFoods(foods, '', 2)).toHaveLength(2);
  });
});
