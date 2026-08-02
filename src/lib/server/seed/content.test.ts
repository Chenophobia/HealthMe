import { describe, it, expect } from 'vitest';
import { RECIPES, EXERCISES } from './content';
import { createTestDb } from '../db/test-db';
import { seedIfEmpty } from './run';
import { recipes, exercises } from '../db/schema';

describe('recipe seed', () => {
  it('has all 20 coded entries', () => {
    const codes = RECIPES.map((r) => r.code).sort();
    expect(codes).toEqual(
      [
        'B1',
        'B2',
        'B3',
        'B4',
        'B5',
        'B6',
        'R1',
        'R2',
        'R3',
        'R4',
        'D1',
        'D2',
        'D3',
        'D4',
        'D5',
        'D6',
        'S1',
        'S2',
        'S3',
        'S4'
      ].sort()
    );
  });

  it('assigns meal types by code prefix', () => {
    for (const r of RECIPES) {
      const expected = { B: 'breakfast', R: 'lunch', D: 'dinner', S: 'snack' }[r.code[0]];
      expect(r.mealType, r.code).toBe(expected);
    }
  });

  it('matches spot-checked macros from the program document', () => {
    const byCode = Object.fromEntries(RECIPES.map((r) => [r.code, r]));
    expect(byCode.R1).toMatchObject({ kcal: 530, proteinG: 54 });
    expect(byCode.R3).toMatchObject({ kcal: 410, proteinG: 38 });
    expect(byCode.D2).toMatchObject({ kcal: 300, proteinG: 35 });
    expect(byCode.D6).toMatchObject({ kcal: 315, proteinG: 29 });
    expect(byCode.B1).toMatchObject({ kcal: 440, proteinG: 49 });
    expect(byCode.S1).toMatchObject({ kcal: 150, proteinG: 20 });
  });

  it('has non-empty ingredients and instructions on every recipe', () => {
    for (const r of RECIPES) {
      expect(r.ingredients.length, r.code).toBeGreaterThan(0);
      expect(r.instructions.length, r.code).toBeGreaterThan(0);
    }
  });
});

describe('exercise seed', () => {
  it('has 5 exercises per session', () => {
    for (const type of ['push', 'pull', 'legs']) {
      expect(EXERCISES.filter((e) => e.sessionType === type)).toHaveLength(5);
    }
  });

  it('matches spot-checked prescriptions', () => {
    const byName = Object.fromEntries(EXERCISES.map((e) => [e.name, e]));
    expect(byName['Chest press']).toMatchObject({ sets: 3, repsMin: 10, repsMax: 12 });
    expect(byName['Cable lateral raise']).toMatchObject({ sets: 3, repsMin: 12, repsMax: 15 });
    expect(byName['Triceps pushdown (cable)']).toMatchObject({ sets: 2, repsMin: 12, repsMax: 12 });
    expect(byName['Lat pulldown'].dumbbellSwap).toBeNull();
    expect(byName['Leg extension']).toMatchObject({ sets: 2, repsMin: 12, repsMax: 12 });
  });
});

describe('seedIfEmpty', () => {
  it('seeds a fresh db and is idempotent', () => {
    const db = createTestDb();
    seedIfEmpty(db);
    seedIfEmpty(db);
    expect(db.select().from(recipes).all()).toHaveLength(20);
    expect(db.select().from(exercises).all()).toHaveLength(15);
  });
});
