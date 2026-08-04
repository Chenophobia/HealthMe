import type { Db } from '../db/connect';
import { recipes, exercises, foods } from '../db/schema';
import { RECIPES, EXERCISES, FOODS } from './content';

export function seedIfEmpty(database: Db): void {
  // BEGIN IMMEDIATE takes the write lock before the emptiness check, so a
  // concurrent process cannot also observe empty tables and double-seed.
  database.transaction(
    (tx) => {
      const existing = tx.select({ id: recipes.id }).from(recipes).limit(1).all();
      if (existing.length > 0) return;
      if (RECIPES.length > 0) {
        tx.insert(recipes)
          .values(RECIPES.map((r, i) => ({ ...r, displayOrder: i + 1 })))
          .run();
      }
      if (EXERCISES.length > 0) {
        tx.insert(exercises)
          .values(EXERCISES.map((e, i) => ({ ...e, displayOrder: i + 1 })))
          .run();
      }
    },
    { behavior: 'immediate' }
  );

  /*
   * Foods get their own emptiness check rather than riding along with the
   * block above. Databases created before foods existed already have recipes,
   * so the shared check would skip them forever and leave the picker empty.
   */
  database.transaction(
    (tx) => {
      const existing = tx.select({ id: foods.id }).from(foods).limit(1).all();
      if (existing.length > 0) return;
      if (FOODS.length > 0) {
        tx.insert(foods)
          .values(FOODS.map((f) => ({ ...f, userId: null, createdAt: new Date().toISOString() })))
          .run();
      }
    },
    { behavior: 'immediate' }
  );
}
