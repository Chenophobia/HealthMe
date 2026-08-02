/**
 * Destructive reference-data rebuild (recipes + exercises).
 *
 * User data (meal logs, workouts, metrics, accounts) is NOT touched, but
 * meal_logs.recipe_id and workout_sets.exercise_id reference these tables,
 * so reseeding while logs exist would orphan those FKs. In that case this
 * refuses and tells you to null out or migrate references first.
 *
 * Usage:
 *   docker compose stop
 *   docker compose run --rm -e RESEED_CONFIRM=yes app npm run reseed
 *   docker compose start
 */
import { sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { db } from '../src/lib/server/db';
import { recipes, exercises, mealLogs, workoutSets } from '../src/lib/server/db/schema';
import { seedIfEmpty } from '../src/lib/server/seed/run';

function count(table: SQLiteTable): number {
  const [row] = db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .all();
  return row?.n ?? 0;
}

function main() {
  const referencingLogs = count(mealLogs) + count(workoutSets);
  if (referencingLogs > 0) {
    console.error(
      `Refusing to reseed: ${referencingLogs} logged rows reference recipes/exercises.\n` +
        'Reseeding would orphan their foreign keys. Migrate or clear logs first.'
    );
    process.exit(1);
  }
  if (process.env.RESEED_CONFIRM !== 'yes') {
    console.error('Refusing to run. Re-run with RESEED_CONFIRM=yes to proceed.');
    process.exit(1);
  }
  db.transaction((tx) => {
    tx.delete(exercises).run();
    tx.delete(recipes).run();
  });
  seedIfEmpty(db);
  console.log(`Reseeded: ${count(recipes)} recipes, ${count(exercises)} exercises.`);
  process.exit(0);
}

main();
