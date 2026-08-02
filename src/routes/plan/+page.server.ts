import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { recipes, exercises } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  recipes: db.select().from(recipes).orderBy(asc(recipes.displayOrder)).all(),
  exercises: db.select().from(exercises).orderBy(asc(exercises.displayOrder)).all()
});
