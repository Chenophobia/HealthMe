import type { recipes, exercises } from '../db/schema';

export type RecipeSeed = Omit<typeof recipes.$inferInsert, 'id' | 'displayOrder'>;
export type ExerciseSeed = Omit<typeof exercises.$inferInsert, 'id' | 'displayOrder'>;

// Populated in Task 3, transcribed from docs/fat-loss-program.md.
export const RECIPES: RecipeSeed[] = [];
export const EXERCISES: ExerciseSeed[] = [];
