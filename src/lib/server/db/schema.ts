import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

// ---- Reference data (seeded from docs/fat-loss-program.md, not user-edited) ----

export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // 'R1'..'R4', 'D1'..'D6', 'B1'..'B6', 'S1'..'S4'
  mealType: text('meal_type').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: text('name').notNull(),
  kcal: integer('kcal').notNull(),
  proteinG: integer('protein_g').notNull(),
  ingredients: text('ingredients').notNull(), // newline-separated lines, verbatim quantities
  instructions: text('instructions').notNull(),
  displayOrder: integer('display_order').notNull()
});

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionType: text('session_type').notNull(), // 'push' | 'pull' | 'legs'
  name: text('name').notNull(), // machine version — the default
  dumbbellSwap: text('dumbbell_swap'), // null when the source table shows '—'
  sets: integer('sets').notNull(),
  repsMin: integer('reps_min').notNull(),
  repsMax: integer('reps_max').notNull(), // equals repsMin for fixed-rep rows like '2 × 12'
  displayOrder: integer('display_order').notNull()
});

// ---- Auth (same shape as learn-japanese) ----

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  remember: integer('remember').notNull(),
  createdAt: text('created_at').notNull()
});

// ---- User data ----

export const bodyMetrics = sqliteTable(
  'body_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    date: text('date').notNull(), // YYYY-MM-DD, server-local
    weightKg: real('weight_kg').notNull(),
    bodyFatPct: real('body_fat_pct'), // nullable — scale sometimes only gives weight
    loggedAt: text('logged_at').notNull()
  },
  (t) => [index('body_metrics_user_date_idx').on(t.userId, t.date)]
);

export const mealLogs = sqliteTable(
  'meal_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    date: text('date').notNull(),
    mealSlot: text('meal_slot').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
    // Exactly one of recipeId / customName is set (enforced in meals.ts, the
    // only writer — SQLite CHECK constraints are awkward to alter later).
    recipeId: integer('recipe_id').references(() => recipes.id),
    customName: text('custom_name'),
    // Snapshotted at log time so a later recipe edit + reseed never rewrites
    // logged history.
    kcal: integer('kcal').notNull(),
    proteinG: integer('protein_g').notNull(),
    loggedAt: text('logged_at').notNull()
  },
  (t) => [index('meal_logs_user_date_idx').on(t.userId, t.date)]
);
