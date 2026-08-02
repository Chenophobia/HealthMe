# Health Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-user SvelteKit health tracker (meal logging against a seeded fat-loss plan, smart-scale weigh-ins, workout set logging, progress charts) deployed to health.chenaners.com via the same GHCR pull-based pipeline as learn-japanese.

**Architecture:** Single SvelteKit 2 (Svelte 5) monolith with `@sveltejs/adapter-node`, SQLite via better-sqlite3 + Drizzle ORM, session-cookie auth (argon2). Reference data (recipes R1–R4/D1–D6/B1–B6/S1–S4, exercises for Push/Pull/Legs) is seeded from a TS module transcribed from `fat-loss-program.md`. Deployed as a linux/arm64 Docker image pulled from GHCR by a launchd-scheduled poll script, fronted by Homebrew nginx + Cloudflare Tunnel on the host Mac.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4, better-sqlite3, Drizzle ORM, @node-rs/argon2, Vitest, Docker, GitHub Actions.

## Global Constraints

- Mirror learn-japanese conventions exactly unless this plan says otherwise (`/Users/chenanigans/Hosted/learn-japanese` is the reference checkout).
- Node >= 22, `engine-strict=true`. npm only.
- App listens on **PORT 3002** (learn-japanese has 3001, chenaners has 3000). Host nginx block listens on **127.0.0.1:8090** (8088/8089 taken).
- Image: `ghcr.io/chenophobia/health-me:latest`. Container name: `health-me`. Domain: `health.chenaners.com`. Repo: `git@github.com:Chenophobia/health-me.git`.
- SQLite journal mode DELETE (not WAL) — same virtiofs bind-mount constraint as learn-japanese.
- Single lint gate: `npm run lint` = `prettier --check . && eslint .`. Type gate: `npm run check`. Tests: `npm test` (vitest run).
- All numbers shown for recipes/exercises come verbatim from `docs/fat-loss-program.md` (copied into the repo in Task 1). Never invent macros. The only derived numbers: snack S3 "Boiled eggs" stores kcal 185 / protein 16 (midpoints of the source's 155–215 kcal / 13–19 g range; the range text stays in the description).
- Dates are `YYYY-MM-DD` strings in the server's local time (container gets `TZ` from `.env`).
- Nutrition targets: 1,750 kcal / 150 g protein (aim 160) — defined once in `src/lib/targets.ts`.
- No chart libraries — inline SVG components, matching learn-japanese's zero-chart-dep approach.
- Commit after every task; commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Scaffold and toolchain

**Files:**
- Create: `package.json`, `.npmrc`, `.gitignore`, `.prettierrc`, `.prettierignore`, `eslint.config.js`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `drizzle.config.ts`, `.env.example`, `src/app.html`, `src/app.css`, `src/app.d.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `static/favicon.svg`, `docs/fat-loss-program.md`

**Interfaces:**
- Produces: a repo where `npm run lint`, `npm run check`, `npm test`, `npm run build` all pass; design tokens `bg-paper`, `bg-surface`, `text-ink`, `text-ink-muted`, `border-hairline`, `text-accent`/`bg-accent` usable in every later task.

- [ ] **Step 1: Copy the source plan document into the repo**

```bash
cp "/Users/chenanigans/Library/Mobile Documents/com~apple~CloudDocs/Documents/Fitness/fat-loss-program.md" /Users/chenanigans/Hosted/health-me/docs/fat-loss-program.md
```

This is the canonical source for every recipe/exercise number in Task 3. It lives in the repo so seed data and source stay reviewable together.

- [ ] **Step 2: Write package.json**

```json
{
  "name": "health-me",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write .",
    "db:generate": "drizzle-kit generate",
    "create-user": "tsx scripts/create-user.ts",
    "set-password": "tsx scripts/set-password.ts",
    "reseed": "tsx scripts/reseed.ts"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@sveltejs/kit": "^2.63.0",
    "@sveltejs/vite-plugin-svelte": "^7.1.2",
    "@tailwindcss/vite": "^4.3.3",
    "@types/better-sqlite3": "^7.6.13",
    "drizzle-kit": "^0.31.10",
    "eslint": "^10.8.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-svelte": "^3.22.0",
    "globals": "^17.8.0",
    "prettier": "^3.9.6",
    "prettier-plugin-svelte": "^4.1.1",
    "prettier-plugin-tailwindcss": "^0.8.1",
    "svelte": "^5.56.1",
    "svelte-check": "^4.6.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.65.0",
    "vite": "^8.0.16",
    "vitest": "^4.1.10"
  },
  "dependencies": {
    "@node-rs/argon2": "^2.0.2",
    "@sveltejs/adapter-node": "^5.5.7",
    "better-sqlite3": "^13.0.2",
    "drizzle-orm": "^0.45.2",
    "tsx": "^4.23.1"
  }
}
```

(learn-japanese's dependency list minus `ts-fsrs`, which was its flashcard scheduler.)

- [ ] **Step 3: Write the small config files**

`.npmrc`:
```
engine-strict=true
```

`.gitignore`:
```
node_modules
/build
/.svelte-kit
/data
.env
deploy/update.log
```

`.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

`.prettierignore`:
```
# Generated or historical artifacts — not style-checked.
node_modules/
build/
.svelte-kit/
data/
drizzle/
package-lock.json
docs/superpowers/
docs/fat-loss-program.md
```

`svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
};
```

`vite.config.ts`:
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
```

`tsconfig.json`:
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "rewriteRelativeImportExtensions": true,
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

`drizzle.config.ts`:
```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: './data/app.db' }
} satisfies Config;
```

`.env.example`:
```
# Directory holding app.db (bind-mounted in Docker)
DATA_DIR=./data
# Timezone used for "today" when logging meals/weigh-ins/workouts.
# The container's clock is UTC without this.
TZ=Europe/London
```

`eslint.config.js` — identical to learn-japanese's (same ignores, same two disabled rules with the same rationale comments):
```js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default ts.config(
  {
    ignores: ['node_modules/', 'build/', '.svelte-kit/', 'data/', 'drizzle/', 'static/', '.claude/']
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // TypeScript already errors on real undefined symbols, with full type
      // information; the untyped core rule only produces false positives here.
      'no-undef': 'off',
      // The app is always served from the domain root (no `paths.base`), so
      // plain absolute hrefs are correct and resolve() would be pure noise.
      'svelte/no-navigation-without-resolve': 'off'
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        svelteConfig
      }
    }
  }
);
```

- [ ] **Step 4: Write the app shell**

`src/app.d.ts`:
```ts
declare global {
  namespace App {
    interface Locals {
      user: { id: number; username: string } | null;
    }
  }
}

export {};
```

`src/app.html` (no theme cookie machinery — dark mode is pure `prefers-color-scheme`, see app.css):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover" class="bg-paper text-ink">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

`src/app.css` — same token system as learn-japanese, but dark mode keys off `prefers-color-scheme` (no toggle; this app has no theme UI):
```css
@import 'tailwindcss';

/* Exclude docs/ (design specs, plans, the source program) from Tailwind's
   content scan — they contain example class strings unused by components. */
@source not '../docs';

/*
 * Design tokens. Each is a real value in @theme (the light default) and is
 * re-pointed under prefers-color-scheme: dark — utilities like `bg-paper`
 * never need a `dark:` prefix because the underlying variable changes.
 * Palette: cool "paper" neutrals with a single green accent (health/go),
 * plus a warning tone for over-target macro bars.
 */
@theme {
  --color-paper: #f6f7f8;
  --color-surface: #ffffff;
  --color-ink: #1b1d21;
  --color-ink-muted: #61666e;
  --color-hairline: #e1e4e9;
  --color-accent: #276847;
  --color-over: #8b2b23;

  --font-sans:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

:root {
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-paper: #14171c;
    --color-surface: #1b1f26;
    --color-ink: #e7e9ec;
    --color-ink-muted: #9aa1ac;
    --color-hairline: #2b3038;
    --color-accent: #59c08c;
    --color-over: #de857c;
  }
}

body {
  font-family: var(--font-sans);
}
```

`src/routes/+layout.svelte` (placeholder — replaced in Task 5):
```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

`src/routes/+page.svelte` (placeholder — replaced in Task 8):
```svelte
<h1 class="p-8 text-2xl font-bold">health-me</h1>
```

`static/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 28C8 21 3 16 3 10.5 3 6.9 6 4 9.5 4c2.5 0 4.9 1.4 6.5 3.6C17.6 5.4 20 4 22.5 4 26 4 29 6.9 29 10.5 29 16 24 21 16 28Z" fill="#276847"/><path d="M6 16h5l2-4 3 7 2.5-5H24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

- [ ] **Step 5: Install and verify all gates pass**

Run: `npm install`
Then: `npm run lint && npm run check && npm test && npm run build`
Expected: all pass (vitest exits 0 with "no test files found" is NOT acceptable — vitest fails on no tests by default in v4; pass `--passWithNoTests` this one time manually to confirm the rest of the chain, or accept the failure and note Task 2 adds the first test. Do NOT add `--passWithNoTests` to package.json.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: scaffold SvelteKit app with toolchain mirroring learn-japanese"
```

---

### Task 2: Database layer

**Files:**
- Create: `src/lib/server/db/schema.ts`, `src/lib/server/db/connect.ts`, `src/lib/server/db/index.ts`, `src/lib/server/db/test-db.ts`
- Test: `src/lib/server/db/connect.test.ts`, `src/lib/server/db/schema.test.ts`

**Interfaces:**
- Produces: `type Db` (drizzle BetterSQLite3Database over the schema); `connect(file: string): Db`; `createTestDb(): Db` (in-memory, migrated); `db` singleton (opens `${DATA_DIR}/app.db`, seeds if empty — seeding wired in Task 3, stubbed here); all table objects: `users`, `sessions`, `recipes`, `exercises`, `bodyMetrics`, `mealLogs`, `workoutSessions`, `workoutSets`.

- [ ] **Step 1: Write the schema**

`src/lib/server/db/schema.ts`:
```ts
import { sqliteTable, integer, text, real, index, unique } from 'drizzle-orm/sqlite-core';

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

export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    date: text('date').notNull(),
    sessionType: text('session_type').notNull(), // 'push' | 'pull' | 'legs'
    createdAt: text('created_at').notNull()
  },
  (t) => [unique('workout_sessions_user_date_type').on(t.userId, t.date, t.sessionType)]
);

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => workoutSessions.id),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    setNumber: integer('set_number').notNull(), // 1-based within (session, exercise)
    weightKg: real('weight_kg').notNull(),
    reps: integer('reps').notNull(),
    createdAt: text('created_at').notNull()
  },
  (t) => [index('workout_sets_session_idx').on(t.sessionId, t.exerciseId)]
);
```

- [ ] **Step 2: Write connect.ts — verbatim from learn-japanese**

`src/lib/server/db/connect.ts` is learn-japanese's file unchanged (same DELETE-journal rationale comment, `synchronous = FULL`, `busy_timeout = 5000`, `foreign_keys = ON`, runs drizzle migrations from `./drizzle`). Only the schema import differs by content, not text:

```ts
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = './drizzle';

export function connect(file: string): Db {
  const sqlite = new Database(file);
  // Rollback journal, NOT WAL. In production app.db lives on a Docker Desktop
  // bind mount (virtiofs), where SQLite's WAL shared-memory index (-shm) does
  // not work across processes — see learn-japanese's connect.ts for the full
  // war story (observed live: the app held `app.db-wal (deleted)`).
  // DELETE mode uses only POSIX fcntl locks, which virtiofs implements.
  sqlite.pragma('journal_mode = DELETE');
  sqlite.pragma('synchronous = FULL');
  // Wait rather than fail instantly if an operator script overlaps the app.
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
```

`src/lib/server/db/test-db.ts`:
```ts
import { connect, type Db } from './connect';

/** Fresh in-memory database with migrations applied — for tests only. */
export function createTestDb(): Db {
  return connect(':memory:');
}
```

`src/lib/server/db/index.ts` (the `seedIfEmpty` import exists after Task 3; for this task write it with the import commented out and a `// TODO(task-3)` — no, placeholders are banned: instead create `src/lib/server/seed/run.ts` in THIS task as a stub that Task 3 fills with real data — see Step 3):
```ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect, type Db } from './connect';
import { seedIfEmpty } from '../seed/run';

function open(): Db {
  const dir = process.env.DATA_DIR ?? './data';
  mkdirSync(dir, { recursive: true });
  const database = connect(join(dir, 'app.db'));
  seedIfEmpty(database);
  return database;
}

export const db: Db = open();
export type { Db };
```

- [ ] **Step 3: Write the seed entrypoint that Task 3 will populate**

`src/lib/server/seed/run.ts` — real, working code (it seeds nothing yet only because the content arrays land in Task 3; the transaction/emptiness logic is final):
```ts
import type { Db } from '../db/connect';
import { recipes, exercises } from '../db/schema';
import { RECIPES, EXERCISES } from './content';

export function seedIfEmpty(database: Db): void {
  // BEGIN IMMEDIATE takes the write lock before the emptiness check, so a
  // concurrent process cannot also observe empty tables and double-seed.
  database.transaction(
    (tx) => {
      const existing = tx.select({ id: recipes.id }).from(recipes).limit(1).all();
      if (existing.length > 0) return;
      tx.insert(recipes).values(RECIPES.map((r, i) => ({ ...r, displayOrder: i + 1 }))).run();
      tx.insert(exercises)
        .values(EXERCISES.map((e, i) => ({ ...e, displayOrder: i + 1 })))
        .run();
    },
    { behavior: 'immediate' }
  );
}
```

And `src/lib/server/seed/content.ts` with the exported types and EMPTY arrays plus one comment line saying Task 3 fills them from `docs/fat-loss-program.md`:
```ts
import type { recipes, exercises } from '../db/schema';

export type RecipeSeed = Omit<typeof recipes.$inferInsert, 'id' | 'displayOrder'>;
export type ExerciseSeed = Omit<typeof exercises.$inferInsert, 'id' | 'displayOrder'>;

// Populated in Task 3, transcribed from docs/fat-loss-program.md.
export const RECIPES: RecipeSeed[] = [];
export const EXERCISES: ExerciseSeed[] = [];
```

- [ ] **Step 4: Generate the migration**

Run: `npm run db:generate`
Expected: creates `drizzle/0000_*.sql` containing CREATE TABLE for all 8 tables. Commit the generated folder (learn-japanese commits `drizzle/`).

- [ ] **Step 5: Write the failing tests**

`src/lib/server/db/connect.test.ts` — copy learn-japanese's three tests verbatim (journal_mode is `delete`; no `-wal`/`-shm` sidecars after a write; committed writes survive reopen). They exercise `connect()` from this repo, so no adaptation beyond imports.

`src/lib/server/db/schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './test-db';
import { users, bodyMetrics, mealLogs, workoutSessions, workoutSets, exercises } from './schema';

describe('schema', () => {
  it('round-trips a body metric', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: '2026-08-02T00:00:00Z' })
      .returning()
      .all();
    db.insert(bodyMetrics)
      .values({
        userId: u.id,
        date: '2026-08-02',
        weightKg: 79.3,
        bodyFatPct: 27.5,
        loggedAt: '2026-08-02T08:00:00Z'
      })
      .run();
    const rows = db.select().from(bodyMetrics).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].weightKg).toBeCloseTo(79.3);
    expect(rows[0].bodyFatPct).toBeCloseTo(27.5);
  });

  it('rejects two workout sessions of the same type on the same day', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    const row = { userId: u.id, date: '2026-08-03', sessionType: 'push', createdAt: 'now' };
    db.insert(workoutSessions).values(row).run();
    expect(() => db.insert(workoutSessions).values(row).run()).toThrow();
  });

  it('allows a meal log with a null recipeId and a customName', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    db.insert(mealLogs)
      .values({
        userId: u.id,
        date: '2026-08-02',
        mealSlot: 'lunch',
        customName: 'Leftover pizza',
        kcal: 700,
        proteinG: 25,
        loggedAt: 'now'
      })
      .run();
    expect(db.select().from(mealLogs).all()[0].recipeId).toBeNull();
  });

  it('enforces the exercises FK on workout sets', () => {
    const db = createTestDb();
    const [u] = db
      .insert(users)
      .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
      .returning()
      .all();
    const [s] = db
      .insert(workoutSessions)
      .values({ userId: u.id, date: '2026-08-03', sessionType: 'push', createdAt: 'now' })
      .returning()
      .all();
    expect(() =>
      db
        .insert(workoutSets)
        .values({ sessionId: s.id, exerciseId: 999, setNumber: 1, weightKg: 20, reps: 10, createdAt: 'now' })
        .run()
    ).toThrow();
    void exercises;
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS (migration exists from Step 4, so `createTestDb()` migrates cleanly).

- [ ] **Step 7: Lint, check, commit**

```bash
npm run lint && npm run check && git add -A && git commit -m "feat: database layer — schema, connect, migrations, in-memory test db"
```

---

### Task 3: Seed content — recipes and exercises from the program

**Files:**
- Modify: `src/lib/server/seed/content.ts` (fill the arrays from Task 2)
- Create: `scripts/reseed.ts`
- Test: `src/lib/server/seed/content.test.ts`

**Interfaces:**
- Consumes: `RecipeSeed`, `ExerciseSeed`, `seedIfEmpty(db)` from Task 2.
- Produces: `RECIPES` (20 entries: B1–B6, R1–R4, D1–D6, S1–S4), `EXERCISES` (15 entries: 5 push, 5 pull, 5 legs). `npm run reseed` (RESEED_CONFIRM=yes guard).

**Every number below is transcribed from `docs/fat-loss-program.md`. Verify each against the file while writing; do not round or adjust.** The single documented exception: S3 stores midpoints (185 kcal / 16 g) of the source ranges, with the ranges kept in its description.

- [ ] **Step 1: Write the failing integrity test**

`src/lib/server/seed/content.test.ts`:
```ts
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
        'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
        'R1', 'R2', 'R3', 'R4',
        'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
        'S1', 'S2', 'S3', 'S4'
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- content`
Expected: FAIL — arrays are empty.

- [ ] **Step 3: Fill content.ts**

Replace the empty arrays. Full transcription (ingredients newline-separated with `\n`; every figure verbatim from the doc):

```ts
export const RECIPES: RecipeSeed[] = [
  // Breakfast — codes B1–B6 assigned here (the source lists them uncoded)
  {
    code: 'B1', mealType: 'breakfast', name: 'Chocolate–Banana smoothie', kcal: 440, proteinG: 49,
    ingredients:
      'Chocolate whey 1 scoop (~30 g)\nSemi-skimmed milk 250 ml\nBanana 120 g\nGreek yogurt (0% / high-protein) 150 g — recommended',
    instructions: 'Blend 2 min.'
  },
  {
    code: 'B2', mealType: 'breakfast', name: 'Chocolate–Blueberry smoothie', kcal: 420, proteinG: 48,
    ingredients:
      'Chocolate whey 1 scoop (~30 g)\nSemi-skimmed milk 250 ml\nBlueberries 100 g\nGreek yogurt (0% / high-protein) 150 g — recommended',
    instructions: 'Blend 2 min.'
  },
  {
    code: 'B3', mealType: 'breakfast', name: 'Overnight oats — banana', kcal: 620, proteinG: 51,
    ingredients:
      'Oats (dry) 40 g\nChocolate whey 1 scoop\nSemi-skimmed milk 200 ml\nBanana 120 g\nGreek yogurt 100 g (optional)\nCashews 15 g (optional)',
    instructions:
      'Mix in a jar at night, eat cold in the morning. Stir the whey into the milk first until smooth, then add oats and fruit — won\'t clump. Macros shown are the with-yogurt-and-cashews version.'
  },
  {
    code: 'B4', mealType: 'breakfast', name: 'Overnight oats — blueberry', kcal: 575, proteinG: 50,
    ingredients:
      'Oats (dry) 40 g\nChocolate whey 1 scoop\nSemi-skimmed milk 200 ml\nBlueberries 100 g\nGreek yogurt 100 g (optional)\nCashews 15 g (optional)',
    instructions:
      'Mix in a jar at night, eat cold in the morning. Stir the whey into the milk first until smooth, then add oats and fruit — won\'t clump. Macros shown are the with-yogurt-and-cashews version.'
  },
  {
    code: 'B5', mealType: 'breakfast', name: 'Greek yogurt bowl', kcal: 330, proteinG: 25,
    ingredients: 'Greek yogurt 200 g\nBlueberries 100 g\nCashews 20 g\nCinnamon',
    instructions: 'No blender needed — combine and eat.'
  },
  {
    code: 'B6', mealType: 'breakfast', name: 'Eggs & toast', kcal: 320, proteinG: 22,
    ingredients: 'Eggs 3\nWholegrain toast 1 slice\nTomato',
    instructions: 'Scramble or air-fry the eggs. No blender needed.'
  },

  // Lunch — batch-prep recipes, codes from the source. All weights raw/before
  // cooking. Each = one portion; multiply ×4–6 to batch a week.
  {
    code: 'R1', mealType: 'lunch', name: 'Chicken, rice & broccoli', kcal: 530, proteinG: 54,
    ingredients: 'Chicken breast 200 g\nWhite rice (dry) 60 g\nBroccoli 150 g\nOlive oil 5 g',
    instructions:
      'Air-fry chicken 190°C, 18–22 min. Boil rice. Steam/air-fry broccoli 200°C, 10–12 min.'
  },
  {
    code: 'R2', mealType: 'lunch', name: 'Lean beef & potato', kcal: 490, proteinG: 40,
    ingredients:
      'Lean beef mince (5% fat) 150 g\nPotato 250 g\nBroccoli/green beans 150 g\nOlive oil 5 g',
    instructions:
      'Pan-fry mince (no oil — fat renders) with spices. Air-fry potato cubes 200°C, 20 min. Steam veg.'
  },
  {
    code: 'R3', mealType: 'lunch', name: 'Chicken rice porridge (congee)', kcal: 410, proteinG: 38,
    ingredients:
      'Chicken breast 150 g\nWhite rice (dry) 50 g\nWater/stock ~600 ml\nCarrot 80 g\nGinger/garlic/spring onion to taste',
    instructions:
      'One pot: simmer rice + chicken + stock + carrot 30–40 min until porridge-like; shred chicken back in. Reheats great — add water.'
  },
  {
    code: 'R4', mealType: 'lunch', name: 'Garlic prawns, rice & broccoli', kcal: 460, proteinG: 40,
    ingredients:
      'Prawns (frozen, peeled) 180 g\nWhite rice (dry) 60 g\nBroccoli/green beans 150 g\nOlive oil + garlic + chili 5 g',
    instructions: 'Prawns air-fry from frozen 200°C, 6–8 min. Fastest recipe here.'
  },

  // Dinner — lighter than lunch; any lunch recipe works here too.
  {
    code: 'D1', mealType: 'dinner', name: 'Beef or chicken stir-fry', kcal: 450, proteinG: 40,
    ingredients:
      'Chicken or 5% beef 150 g\nFrozen stir-fry veg 200 g\nWhite rice (dry) 40 g\nOil + garlic/ginger/soy 5 g',
    instructions: 'Pan or air-fry, high heat, 8–10 min.'
  },
  {
    code: 'D2', mealType: 'dinner', name: 'Prawns & veg (low-carb)', kcal: 300, proteinG: 35,
    ingredients: 'Prawns (frozen, peeled) 180 g\nSalad/mixed veg 200 g\nOlive oil + garlic + lemon 5 g',
    instructions: 'Prawns air-fry from frozen 200°C, 6–8 min.'
  },
  {
    code: 'D3', mealType: 'dinner', name: 'Egg & chicken salad', kcal: 465, proteinG: 51,
    ingredients: 'Eggs 3 (150 g)\nCold cooked chicken 100 g\nTomato + cucumber 200 g\nOlive oil 5 g',
    instructions: 'No cooking — boil/air-fry eggs in a batch.'
  },
  {
    code: 'D4', mealType: 'dinner', name: 'Chickpea bowl', kcal: 460, proteinG: 42,
    ingredients:
      'Chickpeas (1 tin, drained) 240 g\nPrawns or cold chicken 100 g\nVeg + onion 150 g\nOlive oil + lemon 5 g',
    instructions: 'No cooking if using pre-cooked protein.'
  },
  {
    code: 'D5', mealType: 'dinner', name: 'Omelette', kcal: 355, proteinG: 27,
    ingredients: 'Eggs 4 (200 g)\nTomato/onion + side salad 150 g\nOlive oil 3 g',
    instructions: 'Pan 5–6 min.'
  },
  {
    code: 'D6', mealType: 'dinner', name: 'Greek yogurt bowl (light night)', kcal: 315, proteinG: 29,
    ingredients: 'Greek yogurt (0%) 250 g\nBerries 100 g\nCashews 20 g',
    instructions: 'No cooking.'
  },

  // Snacks — codes S1–S4 assigned here (the source lists them in a table)
  {
    code: 'S1', mealType: 'snack', name: 'Greek yogurt / quark pot', kcal: 150, proteinG: 20,
    ingredients: 'Greek yogurt or quark ~150 g',
    instructions: 'Straight from the pot.'
  },
  {
    code: 'S2', mealType: 'snack', name: 'Cashews + fruit', kcal: 245, proteinG: 5,
    ingredients: 'Cashews 25 g\nFruit 1 piece',
    instructions: 'No prep.'
  },
  {
    code: 'S3', mealType: 'snack', name: 'Boiled eggs', kcal: 185, proteinG: 16,
    ingredients: 'Boiled eggs 2–3 (batch 6 ahead)',
    instructions:
      'Source lists 155–215 kcal and 13–19 g protein for 2–3 eggs; logged values are the midpoints.'
  },
  {
    code: 'S4', mealType: 'snack', name: 'Quark + berries', kcal: 180, proteinG: 20,
    ingredients: 'Quark 150 g\nBerries 80 g',
    instructions: 'No prep.'
  }
];

export const EXERCISES: ExerciseSeed[] = [
  // Push — Monday (chest, shoulders, triceps)
  { sessionType: 'push', name: 'Chest press', dumbbellSwap: 'Flat DB press', sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'push', name: 'Incline chest press', dumbbellSwap: 'Incline DB press', sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'push', name: 'Shoulder press', dumbbellSwap: 'Seated DB shoulder press', sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'push', name: 'Cable lateral raise', dumbbellSwap: 'DB lateral raise', sets: 3, repsMin: 12, repsMax: 15 },
  { sessionType: 'push', name: 'Triceps pushdown (cable)', dumbbellSwap: 'DB overhead extension', sets: 2, repsMin: 12, repsMax: 12 },

  // Pull — Wednesday (back, biceps, rear shoulders)
  { sessionType: 'pull', name: 'Lat pulldown', dumbbellSwap: null, sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'pull', name: 'Seated row', dumbbellSwap: 'Bent-over DB row', sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'pull', name: 'Chest-supported row', dumbbellSwap: '1-arm DB row', sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'pull', name: 'Rear-delt fly', dumbbellSwap: 'Bent-over DB rear fly', sets: 3, repsMin: 12, repsMax: 15 },
  { sessionType: 'pull', name: 'Biceps curl', dumbbellSwap: 'DB curl', sets: 3, repsMin: 12, repsMax: 12 },

  // Legs — Friday (quads, hamstrings, glutes)
  { sessionType: 'legs', name: 'Leg press', dumbbellSwap: null, sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'legs', name: 'Hack squat', dumbbellSwap: 'DB goblet squat', sets: 3, repsMin: 10, repsMax: 12 },
  { sessionType: 'legs', name: 'Seated leg curl', dumbbellSwap: null, sets: 3, repsMin: 12, repsMax: 12 },
  { sessionType: 'legs', name: 'Leg extension', dumbbellSwap: null, sets: 2, repsMin: 12, repsMax: 12 },
  { sessionType: 'legs', name: 'Romanian deadlift', dumbbellSwap: 'DB or barbell', sets: 3, repsMin: 10, repsMax: 12 }
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- content`
Expected: PASS. Then open `docs/fat-loss-program.md` side by side and re-verify every kcal/protein/quantity — this is the one step where a typo silently corrupts the product.

- [ ] **Step 5: Write scripts/reseed.ts**

Adapted from learn-japanese (same RESEED_CONFIRM=yes guard, same "stop the app first" doc comment). Reference-data-only: it deletes `recipes`/`exercises` and reseeds. It must REFUSE to run if any `meal_logs` or `workout_sets` rows reference the tables, because history snapshots protect macros but `recipe_id`/`exercise_id` FKs would dangle:

```ts
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
  const [row] = db.select({ n: sql<number>`count(*)` }).from(table).all();
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
```

- [ ] **Step 6: Full gates, commit**

```bash
npm test && npm run lint && npm run check && git add -A && git commit -m "feat: seed recipes and exercises transcribed from the fat-loss program"
```

---

### Task 4: Auth — modules, hooks, login/logout, operator scripts

**Files:**
- Create: `src/lib/server/auth/password.ts`, `credentials.ts`, `session.ts`, `users.ts`, `safe-redirect.ts` (+ the five matching `.test.ts` files), `src/hooks.server.ts`, `src/routes/login/+page.server.ts`, `src/routes/login/+page.svelte`, `src/routes/logout/+server.ts`, `scripts/create-user.ts`, `scripts/set-password.ts`

**Interfaces:**
- Consumes: `db`, `createTestDb`, `users`/`sessions` tables from Task 2.
- Produces: `hashPassword/verifyPassword`, `validateCredentials`, `createSession/validateSession/invalidateSession/sessionMaxAge/SESSION_COOKIE`, `usernameTaken/insertUser/setPasswordHash`, `safeNextPath`. Every non-`/login` route is auth-guarded by hooks; later tasks can assume `locals.user` is non-null in loads/actions.

- [ ] **Step 1: Copy the five auth modules and their tests from learn-japanese verbatim**

```bash
cp /Users/chenanigans/Hosted/learn-japanese/src/lib/server/auth/{password,credentials,session,users,safe-redirect}.ts src/lib/server/auth/
cp /Users/chenanigans/Hosted/learn-japanese/src/lib/server/auth/{password,credentials,session,users,safe-redirect}.test.ts src/lib/server/auth/
```

These are app-agnostic (they only touch `users`/`sessions`, which have identical shapes here). After copying, fix one thing in `users.ts`: its two doc comments are stacked oddly in the source (a comment block for `setPasswordHash` sits above a comment for `insertUser`); reorder so each doc comment sits directly above its function. No behavior change.

- [ ] **Step 2: Run the copied tests**

Run: `npm test -- auth`
Expected: PASS (session.test.ts uses `createTestDb` + `users` table — both exist).

- [ ] **Step 3: Write hooks.server.ts**

learn-japanese's hooks minus the theme machinery:

```ts
import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { SESSION_COOKIE, validateSession } from '$lib/server/auth/session';

const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(SESSION_COOKIE);
  event.locals.user = sessionId ? await validateSession(db, sessionId) : null;
  if (sessionId && !event.locals.user) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
  }

  const isPublic = PUBLIC_ROUTES.includes(event.url.pathname);
  if (!event.locals.user && !isPublic) {
    // Preserve the full path including query string so login returns the
    // user to exactly where they were headed.
    const target = `${event.url.pathname}${event.url.search}`;
    throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
  }
  if (event.locals.user && isPublic) {
    throw redirect(303, '/');
  }

  return resolve(event);
};
```

- [ ] **Step 4: Login action, logout endpoint, layout server load**

`src/routes/login/+page.server.ts` — learn-japanese's file, unchanged (form action verifying username/password, `remember` checkbox, sets `SESSION_COOKIE` with `httpOnly`, `secure` in production, `sameSite: 'lax'`, redirects to `safeNextPath(url.searchParams.get('next'))`).

`src/routes/logout/+server.ts` — learn-japanese's file, unchanged (POST invalidates the session, deletes the cookie, redirects to `/login`).

`src/routes/+layout.server.ts`:
```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
  user: locals.user
});
```

`src/routes/login/+page.svelte`:
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<svelte:head><title>Log in — health-me</title></svelte:head>

<main class="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-6">
  <h1 class="mb-6 text-2xl font-bold">health-me</h1>
  <form method="POST" use:enhance class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm">
      Username
      <input
        name="username"
        autocomplete="username"
        required
        value={form?.username ?? ''}
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      />
    </label>
    <label class="flex flex-col gap-1 text-sm">
      Password
      <input
        name="password"
        type="password"
        autocomplete="current-password"
        required
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      />
    </label>
    <label class="flex items-center gap-2 text-sm">
      <input name="remember" type="checkbox" /> Stay signed in
    </label>
    {#if form?.error}
      <p class="text-over text-sm">{form.error}</p>
    {/if}
    <button class="bg-accent rounded-md px-4 py-2 font-semibold text-white">Log in</button>
  </form>
</main>
```

- [ ] **Step 5: Operator scripts**

`scripts/create-user.ts` and `scripts/set-password.ts` — copy learn-japanese's verbatim, then update the doc-comment container name from `learn-japanese` to `health-me`. (set-password.ts follows the same env-var pattern: `SET_PASSWORD_USERNAME` / `SET_PASSWORD_PASSWORD`, validates with `validateCredentials`, calls `setPasswordHash`, exits non-zero on unknown user — copy from the reference checkout.)

- [ ] **Step 6: Verify the guard works end to end**

Run: `npm run dev` briefly; visit `/` → expect redirect to `/login?next=%2F`. Create a user:
```bash
CREATE_USER_USERNAME=yao CREATE_USER_PASSWORD='pick-a-real-password' npm run create-user
```
Log in → expect redirect to `/` (placeholder page renders). Stop dev server.

- [ ] **Step 7: Gates, commit**

```bash
npm test && npm run lint && npm run check && git add -A && git commit -m "feat: single-user session auth with guarded routes"
```

---

### Task 5: App layout, navigation, and the /plan reference page

**Files:**
- Create: `src/lib/plan-content.ts`, `src/routes/plan/+page.server.ts`, `src/routes/plan/+page.svelte`
- Modify: `src/routes/+layout.svelte` (replace placeholder)

**Interfaces:**
- Consumes: `recipes`/`exercises` tables, `db`, layout `data.user`.
- Produces: nav shell every page renders inside (links: Today `/`, Meals `/meals`, Workouts `/workouts`, Progress `/progress`, Plan `/plan`); `PLAN_PROSE` object holding the program's non-tabular reference text.

- [ ] **Step 1: Replace +layout.svelte**

Same structure as learn-japanese's (sticky header, max-width nav, active-page indicator as an absolutely positioned bar — copy that markup pattern including the Safari rounded-border rationale comment), links array as above, logout form at the right of the nav:

```svelte
<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  let { data, children } = $props();

  const links = [
    { href: '/', label: 'Today' },
    { href: '/meals', label: 'Meals' },
    { href: '/workouts', label: 'Workouts' },
    { href: '/progress', label: 'Progress' },
    { href: '/plan', label: 'Plan' }
  ];
</script>

{#if data.user}
  <header class="border-hairline bg-surface sticky top-0 z-10 border-b">
    <nav
      class="mx-auto flex w-full max-w-3xl items-center gap-1 overflow-x-auto p-2 sm:gap-2 sm:p-4"
      aria-label="Primary"
    >
      {#each links as link (link.href)}
        {@const isActive = page.url.pathname === link.href}
        <a
          href={link.href}
          aria-current={isActive ? 'page' : undefined}
          class="hover:text-ink focus-visible:ring-accent relative rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none sm:px-3 dark:hover:bg-white/10 {isActive
            ? 'text-ink font-semibold'
            : 'text-ink-muted font-medium'}"
        >
          {link.label}
          {#if isActive}
            <span class="bg-accent absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full"></span>
          {/if}
        </a>
      {/each}
      <form method="POST" action="/logout" class="ml-auto">
        <button class="text-ink-muted hover:text-ink px-2 py-2 text-sm">Log out</button>
      </form>
    </nav>
  </header>
{/if}

<main class="mx-auto w-full max-w-3xl p-4 sm:p-6">
  {@render children()}
</main>
```

- [ ] **Step 2: Write plan-content.ts**

The program's prose sections, transcribed from `docs/fat-loss-program.md` (daily-targets table rows, day formula, golden rules, stall protocol, shopping list, weekly schedule, session flow, cardio table, straight-sets explanation, optional home core table, progression rule, deload note, staying-safe text, disclaimer). Shape:

```ts
export const PLAN_PROSE = {
  dailyTargets: [
    { what: 'Calories', target: '~1,750 kcal', why: 'Below ~2,300 maintenance → steady fat loss' },
    { what: 'Protein', target: '150–170 g (aim 160)', why: 'Protects muscle, keeps you full' },
    { what: 'Carbs', target: '~140–160 g', why: 'Energy for training; rice & potatoes fine' },
    { what: 'Fat', target: '~55–65 g', why: 'Needed for hormones & health' },
    { what: 'Water', target: '2.5–3 L', why: 'Controls hunger; reduces face puffiness' }
  ],
  anchors:
    'Only two numbers really matter: stay near 1,750 kcal and hit 150+ g protein. Never drop below ~1,600 kcal.',
  dayFormula:
    'Breakfast + Lunch + Dinner + 1–2 snacks ≈ 1,750 kcal / ~160 g protein. Pick one option per section, mix and match freely.',
  goldenRules: [
    'Protein at every meal.',
    'Volume beats hunger — pile on veg & yogurt.',
    'Liquid calories (juice, sugary coffee, alcohol) quietly wreck a deficit — keep alcohol rare.',
    'Weigh yourself 3×/week, same time; judge the weekly average (daily swings of 1–2 kg are just water).',
    'One flexible meal a week — enjoy it, then back to plan.',
    'Less salt + alcohol + more water de-puffs the face fast.'
  ],
  stallProtocol: [
    'Recount 3 days honestly — cashews, oil and ready-meal calories are the usual hidden culprits.',
    'Add your weekend walk before cutting food.',
    'Only then trim ~100–150 kcal (smaller rice/potato). Never below ~1,600 kcal.'
  ],
  shoppingList: {
    protein:
      'Chicken breast, Lean beef mince (5% fat), Frozen prawns, Eggs, Greek yogurt (0% / high-protein), Quark, Ready grilled chicken trays',
    rest: 'Frozen blueberries + bananas, Broccoli/green beans/carrot/stir-fry veg, Tomato/cucumber/onion/salad/spring onion, Rice/potato/sweet potato, Canned chickpeas/lentils, Cashews/oats, Olive oil/ginger/garlic/paprika/chili, Semi-skimmed milk'
  },
  weeklySchedule: [
    { day: 'Mon', session: 'Push — chest, shoulders, triceps' },
    { day: 'Tue', session: 'Rest (optional 8-min home core)' },
    { day: 'Wed', session: 'Pull — back, biceps, rear shoulders' },
    { day: 'Thu', session: 'Rest (optional 8-min home core)' },
    { day: 'Fri', session: 'Legs — quads, hamstrings, glutes' },
    { day: 'Weekend', session: 'One easy 30–60 min walk' }
  ],
  sessionFlow: [
    { stage: '1 · Warm-up', what: 'Treadmill: incline 10, speed 5.0, 10 min' },
    { stage: '2 · Weights', what: 'The 5 exercises for the day. Straight sets.' },
    { stage: '3 · Finish', what: '10–15 min steady spin bike or rower' }
  ],
  straightSets:
    'Do all sets of one exercise, resting ~60–75 seconds between them, then move to the next exercise. Push each set until it feels hard — stop about 2 reps before failure.',
  homeCore: [
    { exercise: 'Plank', sets: '3 × 30–45 s' },
    { exercise: 'Reverse lunges', sets: '3 × 10 / leg' },
    { exercise: 'Glute bridge', sets: '3 × 15' },
    { exercise: 'Dead bug / bird-dog', sets: '3 × 10' }
  ],
  progression:
    'When you can hit the top of the rep range on all sets with clean form, add a little weight next time (~2.5 kg on machines/bars, 1–2 kg on dumbbells) and drop back to the bottom of the range. Write down weight × reps every session. Take a deload occasionally (same weights, drop the last exercise, ease off cardio) whenever you feel run down.',
  safety:
    'Form before weight — watch one short technique video per lift before your first try. Machines are safe to push to your limit alone. Sharp or joint pain = stop and swap the exercise; muscle burn is normal. Take rest days — muscle grows during recovery. If you ever feel chest pain or dizziness during hard cardio, stop and get checked.',
  disclaimer:
    'Educational plan built from RENPHO body-composition data and peer-reviewed research. Not medical or dietary advice.'
} as const;
```

- [ ] **Step 3: /plan page**

`src/routes/plan/+page.server.ts`:
```ts
import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { recipes, exercises } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
  recipes: db.select().from(recipes).orderBy(asc(recipes.displayOrder)).all(),
  exercises: db.select().from(exercises).orderBy(asc(exercises.displayOrder)).all()
});
```

`src/routes/plan/+page.svelte` renders, in order: Daily targets table (from `PLAN_PROSE.dailyTargets` + `anchors` + `dayFormula`), then recipes grouped by mealType (breakfast → lunch → dinner → snack; each card shows `code · name`, `kcal · g P`, ingredients as a list split on `\n`, instructions), golden rules + stall protocol, shopping list, then the training half: weekly schedule table, session flow, straight-sets note, exercise tables grouped by sessionType (columns: Machine version / Dumbbell swap — render `—` when `dumbbellSwap` is null / `sets × repsMin–repsMax`, collapsing to `sets × reps` when min = max), home core table, progression, safety, disclaimer. Group with:

```ts
const byType = (type: string) => data.recipes.filter((r) => r.mealType === type);
const bySession = (s: string) => data.exercises.filter((e) => e.sessionType === s);
```

Use `bg-surface border-hairline rounded-lg border p-4` cards and `text-ink-muted` secondary text throughout, matching the token system.

- [ ] **Step 4: Visual check, gates, commit**

Run: `npm run dev`, log in, open `/plan`, spot-check R1 (530 kcal · 54 g P, chicken 200 g) and the Push table against `docs/fat-loss-program.md`.

```bash
npm test && npm run lint && npm run check && git add -A && git commit -m "feat: app shell navigation and full plan reference page"
```

---

### Task 6: Meal logging — server module and /meals page

**Files:**
- Create: `src/lib/targets.ts`, `src/lib/dates.ts`, `src/lib/server/meals.ts`, `src/routes/meals/+page.server.ts`, `src/routes/meals/+page.svelte`
- Test: `src/lib/server/meals.test.ts`, `src/lib/dates.test.ts`

**Interfaces:**
- Consumes: `db`, `createTestDb`, `mealLogs`/`recipes` tables.
- Produces: `KCAL_TARGET = 1750`, `PROTEIN_TARGET_G = 150`, `PROTEIN_AIM_G = 160`; `todayLocal(now?: Date): string`; `logRecipeMeal(db, userId, date, mealSlot, recipeId)`, `logCustomMeal(db, userId, date, mealSlot, name, kcal, proteinG)`, `mealsForDate(db, userId, date)` (joined with recipe code/name), `dayTotals(db, userId, date): { kcal: number; proteinG: number }`, `deleteMealLog(db, userId, id)`. Task 8's dashboard reuses `dayTotals`.

- [ ] **Step 1: Write targets.ts and dates.ts**

`src/lib/targets.ts`:
```ts
// The program's two anchor numbers ("only two numbers really matter").
export const KCAL_TARGET = 1750;
export const PROTEIN_TARGET_G = 150; // floor; copy shows "aim 160"
export const PROTEIN_AIM_G = 160;
export const KCAL_FLOOR = 1600; // "never drop below ~1,600 kcal"
```

`src/lib/dates.ts`:
```ts
/** YYYY-MM-DD in the process's local timezone (container sets TZ from .env). */
export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO weekday name used for the training schedule. */
export function weekdayOf(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
}
```

`src/lib/dates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { todayLocal, weekdayOf } from './dates';

describe('todayLocal', () => {
  it('formats a fixed date as YYYY-MM-DD', () => {
    expect(todayLocal(new Date(2026, 7, 2, 9, 30))).toBe('2026-08-02');
  });
  it('pads single-digit month and day', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('weekdayOf', () => {
  it('names the weekday', () => {
    expect(weekdayOf('2026-08-03')).toBe('Monday');
    expect(weekdayOf('2026-08-07')).toBe('Friday');
  });
});
```

- [ ] **Step 2: Write the failing meals tests**

`src/lib/server/meals.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { seedIfEmpty } from './seed/run';
import { users, recipes, mealLogs } from './db/schema';
import { eq } from 'drizzle-orm';
import { logRecipeMeal, logCustomMeal, mealsForDate, dayTotals, deleteMealLog } from './meals';

function setup() {
  const db = createTestDb();
  seedIfEmpty(db);
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  const r1 = db.select().from(recipes).where(eq(recipes.code, 'R1')).all()[0];
  return { db, user, r1 };
}

describe('logRecipeMeal', () => {
  it('snapshots the recipe macros onto the log row', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    const [row] = db.select().from(mealLogs).all();
    expect(row.kcal).toBe(530);
    expect(row.proteinG).toBe(54);
    expect(row.recipeId).toBe(r1.id);
    expect(row.customName).toBeNull();
  });

  it('throws on an unknown recipe id', () => {
    const { db, user } = setup();
    expect(() => logRecipeMeal(db, user.id, '2026-08-02', 'lunch', 9999)).toThrow(/recipe/i);
  });
});

describe('logCustomMeal', () => {
  it('stores name and macros with no recipe reference', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-08-02', 'dinner', 'Takeaway ramen', 800, 30);
    const [row] = db.select().from(mealLogs).all();
    expect(row.customName).toBe('Takeaway ramen');
    expect(row.recipeId).toBeNull();
    expect(row.kcal).toBe(800);
  });

  it('rejects empty names and negative macros', () => {
    const { db, user } = setup();
    expect(() => logCustomMeal(db, user.id, '2026-08-02', 'dinner', '  ', 500, 20)).toThrow();
    expect(() => logCustomMeal(db, user.id, '2026-08-02', 'dinner', 'x', -1, 20)).toThrow();
    expect(() => logCustomMeal(db, user.id, '2026-08-02', 'dinner', 'x', 500, -1)).toThrow();
  });
});

describe('mealsForDate / dayTotals', () => {
  it('returns logs for the date with recipe code and name joined', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    logCustomMeal(db, user.id, '2026-08-02', 'snack', 'Protein bar', 200, 20);
    logCustomMeal(db, user.id, '2026-08-01', 'dinner', 'Yesterday', 500, 30);

    const rows = mealsForDate(db, user.id, '2026-08-02');
    expect(rows).toHaveLength(2);
    const lunch = rows.find((r) => r.mealSlot === 'lunch')!;
    expect(lunch.recipeCode).toBe('R1');
    expect(lunch.name).toBe('Chicken, rice & broccoli');
    const snack = rows.find((r) => r.mealSlot === 'snack')!;
    expect(snack.recipeCode).toBeNull();
    expect(snack.name).toBe('Protein bar');
  });

  it('sums the day', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    logCustomMeal(db, user.id, '2026-08-02', 'snack', 'Bar', 200, 20);
    expect(dayTotals(db, user.id, '2026-08-02')).toEqual({ kcal: 730, proteinG: 74 });
  });

  it('totals zero on an unlogged day', () => {
    const { db, user } = setup();
    expect(dayTotals(db, user.id, '2026-08-02')).toEqual({ kcal: 0, proteinG: 0 });
  });
});

describe('deleteMealLog', () => {
  it('deletes only the caller-owned row', () => {
    const { db, user, r1 } = setup();
    logRecipeMeal(db, user.id, '2026-08-02', 'lunch', r1.id);
    const [row] = db.select().from(mealLogs).all();
    deleteMealLog(db, user.id + 1, row.id); // wrong user — no-op
    expect(db.select().from(mealLogs).all()).toHaveLength(1);
    deleteMealLog(db, user.id, row.id);
    expect(db.select().from(mealLogs).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npm test -- meals` → FAIL (module missing).

- [ ] **Step 4: Implement meals.ts**

```ts
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { mealLogs, recipes } from './db/schema';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function logRecipeMeal(
  db: Db,
  userId: number,
  date: string,
  mealSlot: MealSlot,
  recipeId: number,
  now: Date = new Date()
): void {
  const [recipe] = db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1).all();
  if (!recipe) throw new Error(`Unknown recipe id ${recipeId}`);
  db.insert(mealLogs)
    .values({
      userId,
      date,
      mealSlot,
      recipeId,
      kcal: recipe.kcal,
      proteinG: recipe.proteinG,
      loggedAt: now.toISOString()
    })
    .run();
}

export function logCustomMeal(
  db: Db,
  userId: number,
  date: string,
  mealSlot: MealSlot,
  name: string,
  kcal: number,
  proteinG: number,
  now: Date = new Date()
): void {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Custom meal needs a name');
  if (!Number.isFinite(kcal) || kcal < 0) throw new Error('kcal must be a non-negative number');
  if (!Number.isFinite(proteinG) || proteinG < 0)
    throw new Error('protein must be a non-negative number');
  db.insert(mealLogs)
    .values({
      userId,
      date,
      mealSlot,
      customName: trimmed,
      kcal: Math.round(kcal),
      proteinG: Math.round(proteinG),
      loggedAt: now.toISOString()
    })
    .run();
}

export function mealsForDate(db: Db, userId: number, date: string) {
  return db
    .select({
      id: mealLogs.id,
      mealSlot: mealLogs.mealSlot,
      recipeCode: recipes.code,
      name: sql<string>`coalesce(${recipes.name}, ${mealLogs.customName})`,
      kcal: mealLogs.kcal,
      proteinG: mealLogs.proteinG,
      loggedAt: mealLogs.loggedAt
    })
    .from(mealLogs)
    .leftJoin(recipes, eq(recipes.id, mealLogs.recipeId))
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)))
    .orderBy(mealLogs.loggedAt)
    .all();
}

export function dayTotals(db: Db, userId: number, date: string): { kcal: number; proteinG: number } {
  const [row] = db
    .select({
      kcal: sql<number>`coalesce(sum(${mealLogs.kcal}), 0)`,
      proteinG: sql<number>`coalesce(sum(${mealLogs.proteinG}), 0)`
    })
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)))
    .all();
  return row;
}

export function deleteMealLog(db: Db, userId: number, id: number): void {
  db.delete(mealLogs).where(and(eq(mealLogs.id, id), eq(mealLogs.userId, userId))).run();
}
```

- [ ] **Step 5: Run tests** — `npm test -- meals` → PASS.

- [ ] **Step 6: /meals page**

`src/routes/meals/+page.server.ts`:
```ts
import { fail } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { recipes } from '$lib/server/db/schema';
import {
  MEAL_SLOTS,
  type MealSlot,
  logRecipeMeal,
  logCustomMeal,
  mealsForDate,
  dayTotals,
  deleteMealLog
} from '$lib/server/meals';
import { todayLocal } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  return {
    date,
    recipes: db.select().from(recipes).orderBy(asc(recipes.displayOrder)).all(),
    logs: mealsForDate(db, locals.user!.id, date),
    totals: dayTotals(db, locals.user!.id, date)
  };
};

function slotOf(form: FormData): MealSlot {
  const slot = String(form.get('mealSlot'));
  if (!(MEAL_SLOTS as string[]).includes(slot)) throw new Error('bad slot');
  return slot as MealSlot;
}

export const actions: Actions = {
  recipe: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      logRecipeMeal(db, locals.user!.id, todayLocal(), slotOf(form), Number(form.get('recipeId')));
    } catch {
      return fail(400, { error: 'Could not log that recipe.' });
    }
    return { ok: true };
  },
  custom: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      logCustomMeal(
        db,
        locals.user!.id,
        todayLocal(),
        slotOf(form),
        String(form.get('name') ?? ''),
        Number(form.get('kcal')),
        Number(form.get('proteinG'))
      );
    } catch {
      return fail(400, { error: 'Name, kcal and protein are required (kcal/protein ≥ 0).' });
    }
    return { ok: true };
  },
  delete: async ({ request, locals }) => {
    const form = await request.formData();
    deleteMealLog(db, locals.user!.id, Number(form.get('id')));
    return { ok: true };
  }
};
```

`src/routes/meals/+page.svelte` — structure (all forms `method="POST"` + `use:enhance`):
1. Header: date + running totals vs targets (`{totals.kcal} / 1750 kcal · {totals.proteinG} / 150+ g protein` — import from `$lib/targets`).
2. "Today's log": list of `data.logs` rows — `[code or 'custom'] name · kcal · g P`, each with a delete button posting `?/delete` with hidden `id`.
3. "Log a recipe": slot `<select name="mealSlot">` (default slot by time of day is over-engineering — default `lunch`), recipe `<select name="recipeId">` with `<optgroup>` per meal type showing `code · name · kcal / g P` (any recipe can go in any slot — the plan says any lunch works for dinner), submit to `?/recipe`.
4. "Log custom": slot select + name + kcal + protein number inputs (`min="0"`), submit to `?/custom`. Show `form?.error` if present.

- [ ] **Step 7: Manual check, gates, commit**

Dev server: log R1 into lunch, a custom snack, delete one, confirm totals move.
```bash
npm test && npm run lint && npm run check && git add -A && git commit -m "feat: meal logging with recipe picker, custom entries, and daily totals"
```

---

### Task 7: Body metrics and streaks — server modules

**Files:**
- Create: `src/lib/server/metrics.ts`, `src/lib/server/streaks.ts`, `src/lib/rolling.ts`
- Test: `src/lib/server/metrics.test.ts`, `src/lib/server/streaks.test.ts`, `src/lib/rolling.test.ts`

**Interfaces:**
- Consumes: `db`, `bodyMetrics`/`mealLogs`/`workoutSessions` tables.
- Produces: `addBodyMetric(db, userId, { date, weightKg, bodyFatPct? })` (upserts — one entry per day, latest wins), `listMetrics(db, userId): Array<{ date, weightKg, bodyFatPct }>` ascending; `rollingAverage(points: Array<{ date: string; value: number }>, windowDays = 7)`; `mealStreak(db, userId, today): number`; `sessionsThisWeek(db, userId, today): { done: number; target: 3 }`. Task 8 renders all of these.

- [ ] **Step 1: Failing tests**

`src/lib/rolling.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rollingAverage } from './rolling';

describe('rollingAverage', () => {
  it('averages the trailing window per point', () => {
    const pts = [
      { date: '2026-08-01', value: 80 },
      { date: '2026-08-02', value: 79 },
      { date: '2026-08-08', value: 78 } // 01 falls outside its 7-day window
    ];
    const avg = rollingAverage(pts, 7);
    expect(avg[0].value).toBeCloseTo(80);
    expect(avg[1].value).toBeCloseTo(79.5);
    expect(avg[2].value).toBeCloseTo(78.5); // (79 + 78) / 2
  });

  it('is empty for no points', () => {
    expect(rollingAverage([], 7)).toEqual([]);
  });
});
```

`src/lib/server/metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { addBodyMetric, listMetrics } from './metrics';

function setup() {
  const db = createTestDb();
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('addBodyMetric', () => {
  it('stores a weigh-in with optional body fat', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79.3, bodyFatPct: 27.5 });
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.1 });
    const rows = listMetrics(db, user.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].bodyFatPct).toBeCloseTo(27.5);
    expect(rows[1].bodyFatPct).toBeNull();
  });

  it('replaces a same-day entry instead of duplicating (latest wins)', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 80.0 });
    addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79.3, bodyFatPct: 27.5 });
    const rows = listMetrics(db, user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].weightKg).toBeCloseTo(79.3);
  });

  it('rejects nonsense values', () => {
    const { db, user } = setup();
    expect(() => addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 0 })).toThrow();
    expect(() =>
      addBodyMetric(db, user.id, { date: '2026-08-02', weightKg: 79, bodyFatPct: 101 })
    ).toThrow();
  });

  it('returns metrics sorted by date ascending', () => {
    const { db, user } = setup();
    addBodyMetric(db, user.id, { date: '2026-08-03', weightKg: 79.1 });
    addBodyMetric(db, user.id, { date: '2026-08-01', weightKg: 79.6 });
    expect(listMetrics(db, user.id).map((r) => r.date)).toEqual(['2026-08-01', '2026-08-03']);
  });
});
```

`src/lib/server/streaks.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { seedIfEmpty } from './seed/run';
import { users, workoutSessions } from './db/schema';
import { logCustomMeal } from './meals';
import { mealStreak, sessionsThisWeek } from './streaks';

function setup() {
  const db = createTestDb();
  seedIfEmpty(db);
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  return { db, user };
}

describe('mealStreak', () => {
  it('counts consecutive logged days ending today', () => {
    const { db, user } = setup();
    for (const d of ['2026-07-31', '2026-08-01', '2026-08-02']) {
      logCustomMeal(db, user.id, d, 'lunch', 'x', 500, 30);
    }
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(3);
  });

  it('still counts when today is not yet logged (yesterday anchors)', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-08-01', 'lunch', 'x', 500, 30);
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(1);
  });

  it('breaks on a gap', () => {
    const { db, user } = setup();
    logCustomMeal(db, user.id, '2026-07-30', 'lunch', 'x', 500, 30);
    logCustomMeal(db, user.id, '2026-08-02', 'lunch', 'x', 500, 30);
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(1);
  });

  it('is zero with nothing logged today or yesterday', () => {
    const { db, user } = setup();
    expect(mealStreak(db, user.id, '2026-08-02')).toBe(0);
  });
});

describe('sessionsThisWeek', () => {
  it('counts sessions in the Monday-anchored week of `today`', () => {
    const { db, user } = setup();
    // 2026-08-02 is a Sunday; its week is Mon 07-27 .. Sun 08-02.
    db.insert(workoutSessions)
      .values([
        { userId: user.id, date: '2026-07-27', sessionType: 'push', createdAt: 'now' },
        { userId: user.id, date: '2026-07-29', sessionType: 'pull', createdAt: 'now' },
        { userId: user.id, date: '2026-07-26', sessionType: 'legs', createdAt: 'now' } // prior week
      ])
      .run();
    expect(sessionsThisWeek(db, user.id, '2026-08-02')).toEqual({ done: 2, target: 3 });
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- rolling metrics streaks` → FAIL.

- [ ] **Step 3: Implement**

`src/lib/rolling.ts`:
```ts
export type DatedValue = { date: string; value: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trailing-window average per point (window includes the point's own day). */
export function rollingAverage(points: DatedValue[], windowDays = 7): DatedValue[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const end = new Date(`${p.date}T00:00:00Z`).getTime();
    const start = end - (windowDays - 1) * DAY_MS;
    const inWindow = sorted
      .slice(0, i + 1)
      .filter((q) => new Date(`${q.date}T00:00:00Z`).getTime() >= start);
    const mean = inWindow.reduce((s, q) => s + q.value, 0) / inWindow.length;
    return { date: p.date, value: mean };
  });
}
```

`src/lib/server/metrics.ts`:
```ts
import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { bodyMetrics } from './db/schema';

export function addBodyMetric(
  db: Db,
  userId: number,
  entry: { date: string; weightKg: number; bodyFatPct?: number | null },
  now: Date = new Date()
): void {
  if (!Number.isFinite(entry.weightKg) || entry.weightKg <= 0 || entry.weightKg > 500) {
    throw new Error('weightKg out of range');
  }
  const bf = entry.bodyFatPct ?? null;
  if (bf !== null && (!Number.isFinite(bf) || bf <= 0 || bf >= 100)) {
    throw new Error('bodyFatPct out of range');
  }
  // One entry per day: a re-weigh replaces the earlier one.
  db.delete(bodyMetrics)
    .where(and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.date, entry.date)))
    .run();
  db.insert(bodyMetrics)
    .values({
      userId,
      date: entry.date,
      weightKg: entry.weightKg,
      bodyFatPct: bf,
      loggedAt: now.toISOString()
    })
    .run();
}

export function listMetrics(db: Db, userId: number) {
  return db
    .select({
      date: bodyMetrics.date,
      weightKg: bodyMetrics.weightKg,
      bodyFatPct: bodyMetrics.bodyFatPct
    })
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(asc(bodyMetrics.date))
    .all();
}
```

`src/lib/server/streaks.ts`:
```ts
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { mealLogs, workoutSessions } from './db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

function shiftDate(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Consecutive days with >= 1 meal log, ending at `today` — or at yesterday,
 * so an unbroken run doesn't read as 0 before breakfast is logged.
 */
export function mealStreak(db: Db, userId: number, today: string): number {
  const dates = new Set(
    db
      .selectDistinct({ date: mealLogs.date })
      .from(mealLogs)
      .where(eq(mealLogs.userId, userId))
      .all()
      .map((r) => r.date)
  );
  let anchor = today;
  if (!dates.has(anchor)) anchor = shiftDate(today, -1);
  let streak = 0;
  while (dates.has(anchor)) {
    streak += 1;
    anchor = shiftDate(anchor, -1);
  }
  return streak;
}

/** Monday-anchored week containing `today`. */
export function weekBounds(today: string): { monday: string; sunday: string } {
  const d = new Date(`${today}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  const monday = shiftDate(today, -back);
  return { monday, sunday: shiftDate(monday, 6) };
}

export function sessionsThisWeek(
  db: Db,
  userId: number,
  today: string
): { done: number; target: 3 } {
  const { monday, sunday } = weekBounds(today);
  const [row] = db
    .select({ n: sql<number>`count(*)` })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.date, monday),
        lte(workoutSessions.date, sunday)
      )
    )
    .all();
  return { done: row?.n ?? 0, target: 3 };
}
```

- [ ] **Step 4: Run tests** — `npm test` → all PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run check && git add -A && git commit -m "feat: body metrics, rolling averages, and streak calculations"
```

---

### Task 8: Workouts — server module and /workouts page

**Files:**
- Create: `src/lib/server/workouts.ts`, `src/routes/workouts/+page.server.ts`, `src/routes/workouts/+page.svelte`
- Modify: `src/lib/dates.ts` (add `scheduledSessionFor`)
- Test: `src/lib/server/workouts.test.ts`, extend `src/lib/dates.test.ts`

**Interfaces:**
- Consumes: `db`, `exercises`/`workoutSessions`/`workoutSets` tables, `todayLocal`.
- Produces: `scheduledSessionFor(date): 'push' | 'pull' | 'legs' | null` (Mon/Wed/Fri); `getOrCreateSession(db, userId, date, sessionType)`, `logSet(db, userId, sessionId, exerciseId, weightKg, reps)` (auto-numbers the set), `setsForSession(db, sessionId)`, `lastSetsForExercise(db, userId, exerciseId, beforeDate)` (previous session's sets — the "beat this" hint), `deleteSet(db, userId, setId)`.

- [ ] **Step 1: Add the schedule mapping + test**

Append to `src/lib/dates.ts`:
```ts
export type SessionType = 'push' | 'pull' | 'legs';

/** Mon=Push, Wed=Pull, Fri=Legs — the program's weekly schedule. */
export function scheduledSessionFor(date: string): SessionType | null {
  const dow = new Date(`${date}T12:00:00`).getDay();
  return dow === 1 ? 'push' : dow === 3 ? 'pull' : dow === 5 ? 'legs' : null;
}
```

Append to `src/lib/dates.test.ts`:
```ts
import { scheduledSessionFor } from './dates';

describe('scheduledSessionFor', () => {
  it('maps Mon/Wed/Fri to push/pull/legs and rest days to null', () => {
    expect(scheduledSessionFor('2026-08-03')).toBe('push'); // Monday
    expect(scheduledSessionFor('2026-08-05')).toBe('pull'); // Wednesday
    expect(scheduledSessionFor('2026-08-07')).toBe('legs'); // Friday
    expect(scheduledSessionFor('2026-08-02')).toBeNull(); // Sunday
  });
});
```
(Merge the import with the existing one at the top of the file.)

- [ ] **Step 2: Failing workout-module tests**

`src/lib/server/workouts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { seedIfEmpty } from './seed/run';
import { users, exercises, workoutSets } from './db/schema';
import { eq } from 'drizzle-orm';
import {
  getOrCreateSession,
  logSet,
  setsForSession,
  lastSetsForExercise,
  deleteSet
} from './workouts';

function setup() {
  const db = createTestDb();
  seedIfEmpty(db);
  const [user] = db
    .insert(users)
    .values({ username: 'yao', passwordHash: 'x', createdAt: 'now' })
    .returning()
    .all();
  const chestPress = db.select().from(exercises).where(eq(exercises.name, 'Chest press')).all()[0];
  return { db, user, chestPress };
}

describe('getOrCreateSession', () => {
  it('creates once and returns the same session thereafter', () => {
    const { db, user } = setup();
    const a = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    const b = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    expect(a.id).toBe(b.id);
  });
});

describe('logSet', () => {
  it('auto-increments set numbers per exercise within a session', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    logSet(db, user.id, s.id, chestPress.id, 30, 12);
    logSet(db, user.id, s.id, chestPress.id, 30, 11);
    const sets = setsForSession(db, s.id);
    expect(sets.map((x) => x.setNumber)).toEqual([1, 2]);
  });

  it('rejects a session owned by another user', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    expect(() => logSet(db, user.id + 1, s.id, chestPress.id, 30, 12)).toThrow(/session/i);
  });

  it('rejects nonsense weight/reps', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    expect(() => logSet(db, user.id, s.id, chestPress.id, -5, 12)).toThrow();
    expect(() => logSet(db, user.id, s.id, chestPress.id, 30, 0)).toThrow();
  });
});

describe('lastSetsForExercise', () => {
  it('returns the most recent prior session sets for that exercise', () => {
    const { db, user, chestPress } = setup();
    const mon = getOrCreateSession(db, user.id, '2026-07-27', 'push');
    logSet(db, user.id, mon.id, chestPress.id, 27.5, 12);
    logSet(db, user.id, mon.id, chestPress.id, 27.5, 10);
    const wed = getOrCreateSession(db, user.id, '2026-07-29', 'push');
    logSet(db, user.id, wed.id, chestPress.id, 30, 10);

    const last = lastSetsForExercise(db, user.id, chestPress.id, '2026-08-03');
    expect(last?.date).toBe('2026-07-29');
    expect(last?.sets.map((s) => s.weightKg)).toEqual([30]);
  });

  it('is null with no history', () => {
    const { db, user, chestPress } = setup();
    expect(lastSetsForExercise(db, user.id, chestPress.id, '2026-08-03')).toBeNull();
  });
});

describe('deleteSet', () => {
  it('deletes only caller-owned sets', () => {
    const { db, user, chestPress } = setup();
    const s = getOrCreateSession(db, user.id, '2026-08-03', 'push');
    logSet(db, user.id, s.id, chestPress.id, 30, 12);
    const [row] = db.select().from(workoutSets).all();
    deleteSet(db, user.id + 1, row.id);
    expect(db.select().from(workoutSets).all()).toHaveLength(1);
    deleteSet(db, user.id, row.id);
    expect(db.select().from(workoutSets).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npm test -- workouts` → FAIL.

- [ ] **Step 4: Implement workouts.ts**

```ts
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { Db } from './db/connect';
import { workoutSessions, workoutSets } from './db/schema';
import type { SessionType } from '../dates';

export function getOrCreateSession(
  db: Db,
  userId: number,
  date: string,
  sessionType: SessionType,
  now: Date = new Date()
): { id: number; date: string; sessionType: string } {
  const existing = db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.date, date),
        eq(workoutSessions.sessionType, sessionType)
      )
    )
    .limit(1)
    .all();
  if (existing[0]) return existing[0];
  const [created] = db
    .insert(workoutSessions)
    .values({ userId, date, sessionType, createdAt: now.toISOString() })
    .returning()
    .all();
  return created;
}

function ownedSession(db: Db, userId: number, sessionId: number) {
  const [session] = db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1)
    .all();
  if (!session) throw new Error('No such session for this user');
  return session;
}

export function logSet(
  db: Db,
  userId: number,
  sessionId: number,
  exerciseId: number,
  weightKg: number,
  reps: number,
  now: Date = new Date()
): void {
  ownedSession(db, userId, sessionId);
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000) {
    throw new Error('weightKg out of range');
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error('reps out of range');
  const [maxRow] = db
    .select({ n: sql<number>`coalesce(max(${workoutSets.setNumber}), 0)` })
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseId, exerciseId)))
    .all();
  db.insert(workoutSets)
    .values({
      sessionId,
      exerciseId,
      setNumber: (maxRow?.n ?? 0) + 1,
      weightKg,
      reps,
      createdAt: now.toISOString()
    })
    .run();
}

export function setsForSession(db: Db, sessionId: number) {
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(workoutSets.exerciseId, workoutSets.setNumber)
    .all();
}

export function lastSetsForExercise(
  db: Db,
  userId: number,
  exerciseId: number,
  beforeDate: string
): { date: string; sets: Array<{ setNumber: number; weightKg: number; reps: number }> } | null {
  const [prior] = db
    .select({ id: workoutSessions.id, date: workoutSessions.date })
    .from(workoutSessions)
    .innerJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSets.exerciseId, exerciseId),
        lt(workoutSessions.date, beforeDate)
      )
    )
    .orderBy(desc(workoutSessions.date))
    .limit(1)
    .all();
  if (!prior) return null;
  const sets = db
    .select({
      setNumber: workoutSets.setNumber,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps
    })
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, prior.id), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(workoutSets.setNumber)
    .all();
  return { date: prior.date, sets };
}

export function deleteSet(db: Db, userId: number, setId: number): void {
  const [row] = db
    .select({ id: workoutSets.id, sessionId: workoutSets.sessionId })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSets.sessionId))
    .where(and(eq(workoutSets.id, setId), eq(workoutSessions.userId, userId)))
    .limit(1)
    .all();
  if (row) db.delete(workoutSets).where(eq(workoutSets.id, row.id)).run();
}
```

- [ ] **Step 5: Run tests** — `npm test` → PASS.

- [ ] **Step 6: /workouts page**

`src/routes/workouts/+page.server.ts`:
```ts
import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exercises } from '$lib/server/db/schema';
import { todayLocal, scheduledSessionFor, type SessionType } from '$lib/dates';
import {
  getOrCreateSession,
  logSet,
  setsForSession,
  lastSetsForExercise,
  deleteSet
} from '$lib/server/workouts';
import type { Actions, PageServerLoad } from './$types';

const SESSION_TYPES: SessionType[] = ['push', 'pull', 'legs'];

export const load: PageServerLoad = async ({ locals, url }) => {
  const date = todayLocal();
  const scheduled = scheduledSessionFor(date);
  const picked = url.searchParams.get('session');
  const sessionType = (SESSION_TYPES as string[]).includes(picked ?? '')
    ? (picked as SessionType)
    : (scheduled ?? 'push');

  const list = db
    .select()
    .from(exercises)
    .where(eq(exercises.sessionType, sessionType))
    .orderBy(asc(exercises.displayOrder))
    .all();

  // Read-only view: don't create a session row just for looking at the page.
  const existing = getExistingSession(locals.user!.id, date, sessionType);
  const loggedSets = existing ? setsForSession(db, existing.id) : [];

  return {
    date,
    scheduled,
    sessionType,
    exercises: list.map((e) => ({
      ...e,
      last: lastSetsForExercise(db, locals.user!.id, e.id, date),
      todaySets: loggedSets.filter((s) => s.exerciseId === e.id)
    }))
  };
};

import { and, eq as eq2 } from 'drizzle-orm';
import { workoutSessions } from '$lib/server/db/schema';
function getExistingSession(userId: number, date: string, sessionType: string) {
  return db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq2(workoutSessions.userId, userId),
        eq2(workoutSessions.date, date),
        eq2(workoutSessions.sessionType, sessionType)
      )
    )
    .limit(1)
    .all()[0];
}

export const actions: Actions = {
  logset: async ({ request, locals }) => {
    const form = await request.formData();
    const sessionType = String(form.get('sessionType')) as SessionType;
    if (!SESSION_TYPES.includes(sessionType)) return fail(400, { error: 'Bad session type.' });
    try {
      const session = getOrCreateSession(db, locals.user!.id, todayLocal(), sessionType);
      logSet(
        db,
        locals.user!.id,
        session.id,
        Number(form.get('exerciseId')),
        Number(form.get('weightKg')),
        Number(form.get('reps'))
      );
    } catch {
      return fail(400, { error: 'Weight and reps must be sensible numbers.' });
    }
    return { ok: true };
  },
  deleteset: async ({ request, locals }) => {
    const form = await request.formData();
    deleteSet(db, locals.user!.id, Number(form.get('id')));
    return { ok: true };
  }
};
```
(Consolidate the imports properly at the top of the file when writing it — the mid-file import block above is shown next to its helper for readability only. `getExistingSession` belongs after the imports with the other helpers.)

`src/routes/workouts/+page.svelte` — structure:
1. Header: date + weekday. If `data.scheduled === null`: banner "Rest day — optional 8-min home core (see Plan)". Session-type switcher: three links (`?session=push|pull|legs`), current one highlighted, scheduled one marked "(today)".
2. One card per exercise: name + (`dumbbellSwap` shown as "DB: …" muted text when non-null) + target `{sets} × {repsMin}–{repsMax}` (collapse when equal).
   - "Last time ({last.date}): 30 kg × 10, 30 kg × 9" muted line when `last` non-null — this is the progressive-overload cue; when every last-time set hit `repsMax`, append " — add weight!" (client-side check: `last.sets.every((s) => s.reps >= repsMax)`).
   - Today's logged sets as chips with per-set delete buttons (`?/deleteset`).
   - Inline form (`?/logset`): hidden `exerciseId` + `sessionType`, number inputs `weightKg` (step 0.5, min 0) and `reps` (step 1, min 1), "Log set" button.
3. `form?.error` banner when present.

- [ ] **Step 7: Manual check, gates, commit**

Dev: pick Push, log 2 sets on Chest press, reload, confirm "last time" appears for a fabricated earlier date only if one exists (fresh db: none), delete a set.
```bash
npm test && npm run lint && npm run check && git add -A && git commit -m "feat: workout session logging with last-session progressive-overload hints"
```

---

### Task 9: Dashboard (/) and Progress page

**Files:**
- Create: `src/lib/components/MacroBar.svelte`, `src/lib/components/TrendChart.svelte`, `src/routes/progress/+page.server.ts`, `src/routes/progress/+page.svelte`
- Modify: `src/routes/+page.svelte` (replace placeholder), create `src/routes/+page.server.ts`

**Interfaces:**
- Consumes: `dayTotals`, `mealsForDate`, `addBodyMetric`, `listMetrics`, `rollingAverage`, `mealStreak`, `sessionsThisWeek`, `scheduledSessionFor`, targets from `$lib/targets`.
- Produces: `MacroBar` (props: `label`, `value`, `target`, `unit`, optional `aim`), `TrendChart` (props: `series: Array<{ date: string; value: number }>`, `average?: same`, `unit`, `height?`).

- [ ] **Step 1: MacroBar.svelte**

```svelte
<script lang="ts">
  let {
    label,
    value,
    target,
    unit,
    aim
  }: { label: string; value: number; target: number; unit: string; aim?: number } = $props();

  const pct = $derived(Math.min(100, (value / target) * 100));
  const over = $derived(value > target * 1.05);
</script>

<div class="flex flex-col gap-1">
  <div class="flex justify-between text-sm">
    <span class="font-medium">{label}</span>
    <span class="text-ink-muted">
      {value} / {target}{aim ? `+ (aim ${aim})` : ''} {unit}
    </span>
  </div>
  <div class="bg-hairline h-2.5 w-full overflow-hidden rounded-full">
    <div
      class="h-full rounded-full transition-all {over ? 'bg-over' : 'bg-accent'}"
      style="width: {pct}%"
    ></div>
  </div>
</div>
```
Note the semantics: for calories, going far OVER 1,750 is the bad direction (bar turns `--color-over`); protein over 150 is good but the same visual is acceptable — protein rarely exceeds target by >5% in practice, and one component beats two. (Dashboard passes `target={PROTEIN_TARGET_G} aim={PROTEIN_AIM_G}` for protein.)

- [ ] **Step 2: TrendChart.svelte — dependency-free inline SVG**

```svelte
<script lang="ts">
  type Point = { date: string; value: number };
  let {
    series,
    average,
    unit,
    height = 160
  }: { series: Point[]; average?: Point[]; unit: string; height?: number } = $props();

  const W = 640;
  const PAD = { top: 10, right: 12, bottom: 22, left: 40 };

  const all = $derived([...series, ...(average ?? [])]);
  const dates = $derived(series.map((p) => p.date));
  const t0 = $derived(new Date(`${dates[0]}T00:00:00Z`).getTime());
  const t1 = $derived(new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime());
  const vMin = $derived(Math.min(...all.map((p) => p.value)));
  const vMax = $derived(Math.max(...all.map((p) => p.value)));
  const span = $derived(vMax - vMin || 1);

  function x(date: string): number {
    const t = new Date(`${date}T00:00:00Z`).getTime();
    const f = t1 === t0 ? 0.5 : (t - t0) / (t1 - t0);
    return PAD.left + f * (W - PAD.left - PAD.right);
  }
  function y(v: number): number {
    const f = (v - vMin) / span;
    return height - PAD.bottom - f * (height - PAD.top - PAD.bottom);
  }
  const path = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ');
</script>

{#if series.length === 0}
  <p class="text-ink-muted py-8 text-center text-sm">No entries yet.</p>
{:else}
  <svg viewBox="0 0 {W} {height}" class="w-full" role="img" aria-label="Trend chart">
    <text x="4" y={y(vMax) + 4} class="fill-current text-[10px] opacity-60">{vMax.toFixed(1)}</text>
    <text x="4" y={y(vMin) + 4} class="fill-current text-[10px] opacity-60">{vMin.toFixed(1)}</text>
    <line x1={PAD.left} y1={y(vMin)} x2={W - PAD.right} y2={y(vMin)} class="stroke-current opacity-20" />
    <path d={path(series)} fill="none" class="stroke-current opacity-35" stroke-width="1.5" />
    {#each series as p (p.date)}
      <circle cx={x(p.date)} cy={y(p.value)} r="2.5" class="fill-current opacity-60" />
    {/each}
    {#if average && average.length > 1}
      <path d={path(average)} fill="none" stroke="var(--color-accent)" stroke-width="2.5" />
    {/if}
    <text x={PAD.left} y={height - 6} class="fill-current text-[10px] opacity-60">{dates[0]}</text>
    <text x={W - PAD.right} y={height - 6} text-anchor="end" class="fill-current text-[10px] opacity-60">
      {dates[dates.length - 1]} ({unit})
    </text>
  </svg>
{/if}
```

- [ ] **Step 3: Dashboard**

`src/routes/+page.server.ts`:
```ts
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { dayTotals } from '$lib/server/meals';
import { addBodyMetric, listMetrics } from '$lib/server/metrics';
import { mealStreak, sessionsThisWeek } from '$lib/server/streaks';
import { todayLocal, scheduledSessionFor } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  const metrics = listMetrics(db, locals.user!.id);
  return {
    date,
    scheduled: scheduledSessionFor(date),
    totals: dayTotals(db, locals.user!.id, date),
    streak: mealStreak(db, locals.user!.id, date),
    week: sessionsThisWeek(db, locals.user!.id, date),
    latest: metrics.at(-1) ?? null,
    recent: metrics.slice(-30)
  };
};

export const actions: Actions = {
  weighin: async ({ request, locals }) => {
    const form = await request.formData();
    const weightKg = Number(form.get('weightKg'));
    const bfRaw = String(form.get('bodyFatPct') ?? '').trim();
    try {
      addBodyMetric(db, locals.user!.id, {
        date: todayLocal(),
        weightKg,
        bodyFatPct: bfRaw === '' ? null : Number(bfRaw)
      });
    } catch {
      return fail(400, { error: 'Weight must be a positive number; body fat 0–100 or blank.' });
    }
    return { ok: true };
  }
};
```

`src/routes/+page.svelte` — structure:
1. "Today · {date}" heading; scheduled-session callout linking to `/workouts` ("Push day — log your session") or rest-day note.
2. Card "Today's nutrition": `MacroBar` × 2 (kcal vs `KCAL_TARGET`; protein vs `PROTEIN_TARGET_G` with `aim={PROTEIN_AIM_G}`), link to `/meals`.
3. Card "Weigh-in": latest weight/body-fat line ("79.3 kg · 27.5% on 2026-08-02"), inline `?/weighin` form — `weightKg` (step 0.1, min 1, required), `bodyFatPct` (step 0.1, optional, placeholder "optional"), submit "Log weigh-in". Re-submitting today replaces today's entry (module behavior — say so in muted text).
4. Card "Consistency": `{streak}-day logging streak` · `{week.done}/{week.target} sessions this week`.
5. Card "Weight (last 30 entries)": `TrendChart` with `series={recent weight}` and `average={rollingAverage(recent weight, 7)}` — compute the mapping to `{date, value}` in the page script; link to `/progress`.

- [ ] **Step 4: Progress page**

`src/routes/progress/+page.server.ts`:
```ts
import { db } from '$lib/server/db';
import { listMetrics } from '$lib/server/metrics';
import { mealStreak, sessionsThisWeek } from '$lib/server/streaks';
import { todayLocal } from '$lib/dates';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const date = todayLocal();
  return {
    metrics: listMetrics(db, locals.user!.id),
    streak: mealStreak(db, locals.user!.id, date),
    week: sessionsThisWeek(db, locals.user!.id, date)
  };
};
```

`src/routes/progress/+page.svelte` — structure:
1. "Weight" card: full-history `TrendChart` (weight series + 7-day `rollingAverage` — import `rollingAverage` from `$lib/rolling`, map metrics in the page script). Caption: "Judge the green weekly-average line, not the dots — daily swings of 1–2 kg are just water."
2. "Body fat %" card: `TrendChart` of non-null `bodyFatPct` entries + its 7-day average (skip the card entirely when no entries have body fat).
3. "Consistency" card: streak + sessions this week (same numbers as dashboard).
4. Change summary line when ≥2 weight entries: "Since {first.date}: {(latest.weightKg - first.weightKg).toFixed(1)} kg" (negative reads as loss — render with explicit sign).

- [ ] **Step 5: Manual check, gates, commit**

Dev: log a weigh-in, confirm dashboard chart/latest update; add a second weigh-in for the same day, confirm replacement; check `/progress` renders both charts.
```bash
npm test && npm run lint && npm run check && git add -A && git commit -m "feat: dashboard with macro bars, weigh-ins, streaks, and progress charts"
```

---

### Task 10: Docker

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`

**Interfaces:**
- Consumes: the built app (`npm run build` → `build/index.js`), `drizzle/` migrations, `scripts/` + `src/lib/server` (for tsx-run operator scripts).
- Produces: image serving on 3002; `docker compose up` works from a fresh clone with only `.env` present.

- [ ] **Step 1: .dockerignore**

```
node_modules
.svelte-kit
build
data
.git
.env
docs
.github
.claude
deploy
```

- [ ] **Step 2: Dockerfile — learn-japanese's with PORT 3002**

Copy learn-japanese's Dockerfile verbatim (including the better-sqlite3 glibc-rebuild comment and step — same base image, same native-module problem), changing only:
- `ENV NODE_ENV=production PORT=3002 HOST=0.0.0.0 DATA_DIR=/app/data`
- `EXPOSE 3002`

Full text for reference:
```dockerfile
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
# better-sqlite3 ships prebuilt binaries linked against a newer glibc than
# node:22-slim ships, so they fail at runtime (ERR_DLOPEN_FAILED) even though
# `npm ci` succeeds. Compile a matching binary, then remove the bundled
# prebuilds so better-sqlite3's loader falls back to the one we just built.
RUN npm install --global node-gyp \
  && cd node_modules/better-sqlite3 && node-gyp rebuild --release --force_build=1 \
  && rm -rf prebuilds

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3002 HOST=0.0.0.0 DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
# Needed at runtime for `npm run create-user` / `set-password` / `reseed`:
# they run off TypeScript source via tsx (a production dependency), reusing
# the app's own db/auth modules.
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib/server ./src/lib/server
EXPOSE 3002
CMD ["node", "build/index.js"]
```

Note: the tsx-run scripts import from `$lib/dates` via `src/lib/server/workouts.ts`? — no: `workouts.ts` imports `$lib/dates`, but no operator script imports `workouts.ts`. If `svelte-check` or runtime resolution complains about the `$lib` alias under tsx, change `workouts.ts` to import the type from a relative path (`../dates`) — tsx does not resolve SvelteKit's `$lib` alias. **Prefer relative imports (`../..`-style) for anything under `src/lib/server` that operator scripts might transitively touch; keep `$lib` aliases for route files only.** Apply this rule during Tasks 6–8 as written (they already use relative imports inside `src/lib/server`, except the `$lib/dates` type import in workouts.ts — write it as `import type { SessionType } from '../dates'` there).

- [ ] **Step 3: docker-compose.yml**

```yaml
services:
  app:
    build: .
    container_name: health-me
    ports:
      - '127.0.0.1:3002:3002'
    env_file: .env
    environment:
      DATA_DIR: /app/data
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

- [ ] **Step 4: Build and smoke-test locally**

```bash
docker compose build && docker compose up -d
curl -sI http://127.0.0.1:3002/login | head -1
docker compose run --rm -e CREATE_USER_USERNAME=smoke -e CREATE_USER_PASSWORD=smoketest123 app npm run create-user
docker compose down
```
Expected: `HTTP/1.1 200 OK` on /login; create-user prints `Created user "smoke"`. (This writes ./data/app.db — fine, it's gitignored; delete it after if you want a clean slate.)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: multi-stage Dockerfile and compose for local deployment on port 3002"
```

---

### Task 11: CI and Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/workflows/dependabot-auto-merge.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: `npm run lint` / `check` / `test` / `build`, the Dockerfile.
- Produces: GHCR image `ghcr.io/chenophobia/health-me:latest` + `sha-*` on every main push.

- [ ] **Step 1: Copy all four files from learn-japanese**

```bash
mkdir -p .github/workflows
cp /Users/chenanigans/Hosted/learn-japanese/.github/workflows/{ci.yml,codeql.yml,dependabot-auto-merge.yml} .github/workflows/
cp /Users/chenanigans/Hosted/learn-japanese/.github/dependabot.yml .github/
```

- [ ] **Step 2: Make the two repo-specific edits**

1. `dependabot-auto-merge.yml`: change the guard to `github.repository == 'Chenophobia/health-me'`.
2. `dependabot.yml`: keep everything (the typescript/cookie/esbuild/node ignores all still apply — same SvelteKit + drizzle-kit + node:22-slim stack). No other changes: `ci.yml` uses `ghcr.io/${{ github.repository }}` so it retargets itself; `codeql.yml` is repo-agnostic.

- [ ] **Step 3: Verify workflow YAML parses**

Run: `docker run --rm -v "$PWD":/repo -w /repo ghcr.io/rhysd/actionlint:latest` — or, simpler, push and watch the Actions tab in Step 4. (actionlint locally is optional; do not add it to the repo.)

- [ ] **Step 4: Commit and push; confirm CI goes green**

```bash
git add -A && git commit -m "ci: GitHub Actions (checks + arm64 GHCR image), CodeQL, Dependabot"
git push origin main
gh run watch --repo Chenophobia/health-me
```
Expected: `checks` passes, `docker` builds linux/arm64 and pushes `ghcr.io/chenophobia/health-me:latest`. If the GHCR push fails with a permissions error, check the repo's Settings → Actions → General → Workflow permissions allows "Read and write" (learn-japanese has this set).

Also enable branch protection to make auto-merge meaningful, matching learn-japanese:
```bash
gh api repos/Chenophobia/health-me/branches/main/protection -X PUT \
  -F 'required_status_checks[strict]=false' \
  -F 'required_status_checks[contexts][]=Lint, typecheck, test' \
  -F 'required_status_checks[contexts][]=Docker image' \
  -F 'enforce_admins=false' \
  -F 'required_pull_request_reviews=null' \
  -F 'restrictions=null'
```
(Verify learn-japanese's exact protection settings first with `gh api repos/Chenophobia/learn-japanese-anki/branches/main/protection` and mirror those instead if they differ.)

---

### Task 12: Deploy automation and README

**Files:**
- Create: `deploy/compose.yml`, `deploy/update.sh` (chmod +x), `deploy/com.chenophobia.health-me.update.plist`, `README.md`

**Interfaces:**
- Consumes: the GHCR image from Task 11.
- Produces: the same pull-based CD learn-japanese has, for this app.

- [ ] **Step 1: deploy/compose.yml**

```yaml
# Pull-based deployment: runs the image CI publishes to GHCR instead of
# building from source on the host. The root docker-compose.yml (build: .)
# remains the build-from-source fallback.
#
# Paths are relative to this file, so ../data and ../.env are the same data
# directory and env file the root compose file uses — switching between the
# two never touches state.
name: health-me
services:
  app:
    image: ghcr.io/chenophobia/health-me:latest
    container_name: health-me
    ports:
      - '127.0.0.1:3002:3002'
    env_file: ../.env
    environment:
      DATA_DIR: /app/data
    volumes:
      - ../data:/app/data
    restart: unless-stopped
```

- [ ] **Step 2: deploy/update.sh**

Copy learn-japanese's `deploy/update.sh` verbatim, replacing both `learn-japanese` container-name references with `health-me` (the two `docker inspect --format '{{.Image}}' health-me` lines; the plist reference in the header comment becomes `com.chenophobia.health-me.update.plist`). Then `chmod +x deploy/update.sh`.

- [ ] **Step 3: launchd plist template**

Copy learn-japanese's plist, with every `learn-japanese` label/path swapped to `health-me` — label `com.chenophobia.health-me.update`, same `__REPO__` substitution scheme, same `StartInterval` 300, same PATH env, same install/uninstall instructions in the comment (with the filename updated).

- [ ] **Step 4: README.md**

Sections, mirroring learn-japanese's README structure:
1. **What this is** — one paragraph: personal single-user health tracker for the fat-loss program (meals, weigh-ins, workouts, progress); source plan lives at `docs/fat-loss-program.md`.
2. **Stack** — SvelteKit 2/Svelte 5, Tailwind 4, SQLite (better-sqlite3 + Drizzle), argon2 sessions.
3. **Develop** — `npm install`, `cp .env.example .env`, `npm run dev`, create a user with the env-var invocation, `npm test` / `npm run lint` / `npm run check`.
4. **Environment variables** — table: `DATA_DIR` (SQLite directory, bind-mounted in Docker), `TZ` (local "today" for logging).
5. **Docker** — root compose (build-from-source) vs `deploy/compose.yml` (GHCR pull); create-user/set-password/reseed invocations via `docker compose run --rm -e ... app npm run ...` with the stop-first warning.
6. **Deployment** — CI → GHCR (`ghcr.io/chenophobia/health-me`), `deploy/update.sh` + launchd polling (install commands), and the request path:
   ```
   Browser → Cloudflare edge (TLS) → Cloudflare Tunnel → cloudflared (host)
           → 127.0.0.1:8090 (Homebrew nginx) → 127.0.0.1:3002 (Docker app)
   ```
   Go-live checklist (the Task 13 steps, summarized). Note the container port is bound to 127.0.0.1 only. Do not include real tunnel IDs or credential paths — repo may be public.

- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "feat: pull-based deploy automation (GHCR poll + launchd) and README"
git push origin main
```

---

### Task 13: Host go-live — nginx, tunnel, launchd, first user

This task is host configuration, not repo code (except a final push). Execute inline (not via a code subagent) since it touches `/opt/homebrew` and `~/.cloudflared`.

- [ ] **Step 1: Pull and start the app on the host**

```bash
cd /Users/chenanigans/Hosted/health-me
cp .env.example .env   # then edit TZ if needed
docker compose -f deploy/compose.yml pull
docker compose -f deploy/compose.yml up -d
curl -sI http://127.0.0.1:3002/login | head -1   # expect 200
```

- [ ] **Step 2: Create the real user**

```bash
docker compose -f deploy/compose.yml stop
docker compose -f deploy/compose.yml run --rm \
  -e CREATE_USER_USERNAME=<username> -e CREATE_USER_PASSWORD='<password>' \
  app npm run create-user
docker compose -f deploy/compose.yml start
```
(Ask the user for their preferred username; NEVER echo the password anywhere. The user should type the password themselves or set it after.)

- [ ] **Step 3: nginx server block**

Write `/opt/homebrew/etc/nginx/servers/health.conf` (mirroring `learn-japanese.conf`'s shape — read it first and copy its proxy_set_header lines exactly):
```nginx
server {
    listen 127.0.0.1:8090;
    server_name health.chenaners.com;
    location / {
        proxy_pass http://127.0.0.1:3002;
        # (copy the proxy_set_header block from learn-japanese.conf)
    }
}
```
Then: `nginx -t && nginx -s reload` (or `brew services restart nginx` if reload signalling fails).

- [ ] **Step 4: Cloudflare Tunnel ingress + DNS**

Edit `~/.cloudflared/config.yml`: add ABOVE the catch-all `http_status:404` rule:
```yaml
  # health.chenaners.com -> local nginx :8090 -> Docker app :3002
  - hostname: health.chenaners.com
    service: http://localhost:8090
```
DNS: the user already created a CNAME for `health.chenaners.com` in the Cloudflare dashboard, and it already resolves through the Cloudflare proxy. Verify it targets the tunnel: run `cloudflared tunnel route dns <tunnel-id> health.chenaners.com` (get `<tunnel-id>` from the `tunnel:` line of config.yml). If it errors that a record already exists, open the Cloudflare DNS dashboard and confirm the CNAME's target is `<tunnel-id>.cfargotunnel.com` (proxied). If it targets anything else, update it to that value — do not delete other records.
Then restart the tunnel: `brew services restart cloudflared`.

- [ ] **Step 5: Verify end to end**

```bash
curl -sI https://health.chenaners.com/login | head -1   # expect HTTP/2 200
```
Then log in from a phone browser and spot-check /meals, /workouts, /plan.

- [ ] **Step 6: Install the auto-update launchd agent**

```bash
cd /Users/chenanigans/Hosted/health-me
sed "s|__REPO__|$PWD|g" deploy/com.chenophobia.health-me.update.plist \
  > ~/Library/LaunchAgents/com.chenophobia.health-me.update.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.chenophobia.health-me.update.plist
```
Verify: `launchctl print gui/$(id -u)/com.chenophobia.health-me.update | head -5` shows the job; after 5 min `deploy/update.log` stays empty (healthy poll writes nothing).

- [ ] **Step 7: Done marker**

Confirm with the user that https://health.chenaners.com works on their devices, then delete any smoke-test user created in Task 10 if it leaked into production data (it shouldn't have — Task 10 used local `./data`, Task 13 starts fresh on the host copy; verify with the user regardless).

---

## Self-review notes

- **Spec coverage**: plan lookup (/plan, Task 5) ✓; workout lookup + full session logging (Task 8) ✓; weight+bf registration (Task 9 dashboard weigh-in, Task 7 module) ✓; meal logging by code or custom (Task 6) ✓; macro progress bar, trend chart with weekly average, streaks (Tasks 7/9) ✓; single-user auth (Task 4) ✓; CI/Docker/GHCR/deploy/nginx/tunnel per learn-japanese conventions (Tasks 10–13) ✓; seed-data integrity tests (Task 3) ✓; snapshot-on-log (Task 6 schema+module) ✓; exactly-one-of recipe/custom enforced in the writer module (Task 6) ✓.
- **Type consistency**: `SessionType` defined once in `$lib/dates` (Task 8 Step 1), imported relatively as `../dates` inside `src/lib/server` (Task 10 note); `MealSlot`/`MEAL_SLOTS` defined in meals.ts and reused by its page; `Db` from connect.ts everywhere.
- **Known deviation from learn-japanese**: no theme toggle/cookie (prefers-color-scheme only), no PWA icons/manifest (user chose responsive-web-only), `SESSION_SECRET` dropped from .env (learn-japanese itself documents it as unused).
- **Port/name collisions checked on host**: 3000/3001 and 8088/8089 taken → 3002/8090; container `health-me`; nginx `health.conf`; plist label `com.chenophobia.health-me.update`.
