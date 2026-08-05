import { sqliteTable, integer, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

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

/*
 * Individual foods, logged by quantity.
 *
 * Nutrition is stored per `baseQty` rather than per unit so both weights and
 * countable things fit one table: 100 g of chicken, 1 banana. Everything else
 * scales from that.
 *
 * `userId` is null on the seeded starters and set on anything added in-app.
 * Archived rather than deleted — a food is referenced by every meal you logged
 * with it, and removing it would orphan that history.
 */
export const foods = sqliteTable(
  'foods',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id),
    name: text('name').notNull(),
    unit: text('unit').notNull(), // 'g' | 'ml' | 'item'
    baseQty: real('base_qty').notNull(), // 100 for g/ml, 1 for item
    kcal: real('kcal').notNull(), // per baseQty
    proteinG: real('protein_g').notNull(), // per baseQty
    defaultQty: real('default_qty').notNull(),
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull()
  },
  (t) => [index('foods_name_idx').on(t.name)]
);

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
  createdAt: text('created_at').notNull(),
  // Standing facts the BMR estimate needs. Nullable: the app works without
  // them, it just can't compute a resting burn. Birth date rather than age so
  // it never goes stale.
  heightCm: real('height_cm'),
  birthDate: text('birth_date'), // YYYY-MM-DD
  sex: text('sex'), // 'male' | 'female' — the only two constants Mifflin-St Jeor defines
  // What the intake target is worked back from. Nullable: without a goal the
  // app falls back to the program's fixed anchor in targets.ts.
  goalWeightKg: real('goal_weight_kg'),
  goalDate: text('goal_date'), // YYYY-MM-DD
  // The Today page's card order, comma-separated card keys (see
  // $lib/today-cards.ts). Null means the default order; unknown keys are
  // dropped and missing ones appended on read, so stale values can't break
  // the page after a redesign.
  todayOrder: text('today_order')
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
    // Renpho's BMR estimate, read off the same weigh-in. Nullable for the
    // same reason as body fat, and because every entry logged before this
    // column existed has none.
    bmrKcal: integer('bmr_kcal'),
    loggedAt: text('logged_at').notNull()
  },
  (t) => [index('body_metrics_user_date_idx').on(t.userId, t.date)]
);

/*
 * Active energy burned, one row per day.
 *
 * Deliberately not a column on body_metrics: that table is body composition
 * measured at a single moment, and a re-weigh replaces the whole row — which
 * would wipe a day's accumulated burn. This also arrives from a different
 * writer (the Shortcuts automation) on its own schedule.
 */
export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    date: text('date').notNull(),
    // Apple Health's *Active* Energy. Kept apart from resting burn so the
    // two are never added into each other's territory.
    activeKcal: integer('active_kcal').notNull(),
    // Apple Health's Resting (Basal) Energy, the Watch's own estimate. Null
    // for days logged before the Shortcut learned to send it — the budget
    // math falls back to BMR then.
    basalKcal: integer('basal_kcal'),
    source: text('source').notNull(), // 'shortcut' | 'manual'
    loggedAt: text('logged_at').notNull()
  },
  // Unique so the day can be upserted — the Shortcut re-posts a growing total
  // through the day and must overwrite, not accumulate.
  (t) => [uniqueIndex('activity_logs_user_date_idx').on(t.userId, t.date)]
);

/*
 * Bearer tokens for the Apple Shortcut. Separate from sessions: these never
 * expire, are not tied to a browser, and only carry the right to post
 * activity. Stored as a SHA-256 digest — unlike a password these are already
 * 256 bits of CSPRNG output, so they need a fast digest, not a slow KDF.
 */
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(), // what it's for, e.g. 'iphone-shortcut'
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at')
});

export const mealLogs = sqliteTable(
  'meal_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    date: text('date').notNull(),
    mealSlot: text('meal_slot').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
    // Exactly one of recipeId / foodId / customName is set (enforced in meals.ts,
    // the only writer — SQLite CHECK constraints are awkward to alter later).
    recipeId: integer('recipe_id').references(() => recipes.id),
    foodId: integer('food_id').references(() => foods.id),
    customName: text('custom_name'),
    /** How much of the food — null for recipe and custom rows. */
    quantity: real('quantity'),
    // Snapshotted at log time so a later recipe edit + reseed never rewrites
    // logged history.
    kcal: integer('kcal').notNull(),
    proteinG: integer('protein_g').notNull(),
    loggedAt: text('logged_at').notNull()
  },
  (t) => [index('meal_logs_user_date_idx').on(t.userId, t.date)]
);
