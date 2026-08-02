# Dated Logging + Workout Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let meals and weigh-ins be logged for days other than today, and convert `/workouts` into a read-only lookup page by deleting all workout-logging code, tables, and widgets.

**Architecture:** Meals become date-addressable via a `?date=` query param with a date bar; the weigh-in form gains a date field capped at today. Workout logging (server module, two DB tables, forms, dashboard/progress widgets) is removed with a generated drop-tables migration; the exercises reference data and the push/pull/legs lookup UI stay.

**Tech Stack:** SvelteKit 2 / Svelte 5 (runes), TypeScript, Drizzle ORM + better-sqlite3, Tailwind CSS 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-02-dated-logging-and-workout-lookup-design.md`

## Global Constraints

- All work directly on `main` (established for this repo with user consent).
- After each task: `npm test`, `npm run lint`, and `npm run check` must all pass.
- Data-layer functions already take `date` parameters — do NOT change `src/lib/server/meals.ts` or `src/lib/server/metrics.ts`.
- Date strings are `YYYY-MM-DD` everywhere; comparisons use plain string comparison (valid for this format).
- Keep the `exercises` table, its seed data, `scheduledSessionFor`, the `/plan` page, and the Workouts nav link — only *logging* is removed.
- Svelte 5 syntax only: `$props()`, `$derived`, `onchange` (not `on:change`).
- Commit messages: conventional commits, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Dated logging for meals and weigh-ins

**Files:**
- Modify: `src/lib/dates.ts`
- Modify: `src/lib/dates.test.ts`
- Modify: `src/routes/meals/+page.server.ts`
- Modify: `src/routes/meals/+page.svelte`
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `todayLocal()`, `weekdayOf()` from `$lib/dates`; `logRecipeMeal` / `logCustomMeal` / `mealsForDate` / `dayTotals` (all already date-parameterized); `addBodyMetric` (already upserts per-date).
- Produces: `isValidDate(s: string): boolean` and `shiftDate(date: string, days: number): string` in `src/lib/dates.ts` — Task 2's rewrite of `streaks.ts` imports `shiftDate` from here.

- [ ] **Step 1: Write failing tests for `isValidDate` and `shiftDate`**

Append to `src/lib/dates.test.ts` (and extend its import line to `import { todayLocal, weekdayOf, scheduledSessionFor, isValidDate, shiftDate } from './dates';`):

```ts
describe('isValidDate', () => {
  it('accepts a real date', () => {
    expect(isValidDate('2026-08-02')).toBe(true);
  });
  it('rejects wrong shapes', () => {
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('2026-8-2')).toBe(false);
    expect(isValidDate('02-08-2026')).toBe(false);
    expect(isValidDate('2026-08-02T00:00:00')).toBe(false);
  });
  it('rejects impossible calendar dates', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2025-02-29')).toBe(false); // 2025 is not a leap year
  });
  it('accepts a leap day in a leap year', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
  });
});

describe('shiftDate', () => {
  it('shifts forward across a month boundary', () => {
    expect(shiftDate('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('shifts backward across a month boundary', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('zero days is identity', () => {
    expect(shiftDate('2026-08-02', 0)).toBe('2026-08-02');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/dates.test.ts`
Expected: FAIL — `isValidDate` / `shiftDate` are not exported.

- [ ] **Step 3: Implement the helpers**

Append to `src/lib/dates.ts`:

```ts
/** Strict YYYY-MM-DD: right shape AND a real calendar date (2026-02-30 fails). */
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** `date` shifted by `days` calendar days (UTC arithmetic on the date-only value). */
export function shiftDate(date: string, days: number): string {
  const t = new Date(`${date}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/dates.test.ts`
Expected: PASS.

- [ ] **Step 5: Make the meals route date-addressable**

Replace `src/routes/meals/+page.server.ts` in full:

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
import { todayLocal, isValidDate, shiftDate } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const today = todayLocal();
  const picked = url.searchParams.get('date') ?? '';
  const date = isValidDate(picked) ? picked : today;
  return {
    date,
    today,
    prevDate: shiftDate(date, -1),
    nextDate: shiftDate(date, 1),
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

/** The date the page was viewing when submitted — carried in a hidden field. */
function dateOf(form: FormData): string {
  const date = String(form.get('date') ?? '');
  if (!isValidDate(date)) throw new Error('bad date');
  return date;
}

export const actions: Actions = {
  recipe: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      logRecipeMeal(db, locals.user!.id, dateOf(form), slotOf(form), Number(form.get('recipeId')));
    } catch {
      return fail(400, { error: 'Could not log that recipe.' });
    }
    return { ok: true };
  },
  custom: async ({ request, locals }) => {
    const form = await request.formData();
    const kcalRaw = String(form.get('kcal') ?? '').trim();
    const proteinRaw = String(form.get('proteinG') ?? '').trim();
    if (!kcalRaw || !proteinRaw) {
      return fail(400, { error: 'Name, kcal and protein are required (kcal/protein ≥ 0).' });
    }
    try {
      logCustomMeal(
        db,
        locals.user!.id,
        dateOf(form),
        slotOf(form),
        String(form.get('name') ?? ''),
        Number(kcalRaw),
        Number(proteinRaw)
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

(Note: with `use:enhance`, submitting re-runs `load` against the page's current URL, so the viewed `?date=` sticks after logging. The hidden field — not the URL — is what the action trusts.)

- [ ] **Step 6: Add the date bar and date-aware copy to the meals page**

In `src/routes/meals/+page.svelte`:

6a. Extend the script block — add two imports and one derived value:

```ts
  import { goto } from '$app/navigation';
  import { weekdayOf } from '$lib/dates';
```

and alongside the existing `$derived` lines:

```ts
  const isToday = $derived(data.date === data.today);
```

6b. Replace the header block

```svelte
<h1 class="text-2xl font-bold">Meals</h1>
<p class="text-ink-muted mt-1 text-sm">{data.date}</p>
```

with:

```svelte
<h1 class="text-2xl font-bold">Meals</h1>
<p class="text-ink-muted mt-1 text-sm">{data.date} · {weekdayOf(data.date)}</p>

<!-- ============================= Date bar ============================= -->
<div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
  <a
    href="?date={data.prevDate}"
    aria-label="Previous day"
    class="border-hairline bg-surface text-ink-muted hover:text-ink rounded-md border px-3 py-2"
  >
    ←
  </a>
  <input
    type="date"
    value={data.date}
    aria-label="Go to date"
    onchange={(e) => {
      const v = e.currentTarget.value;
      if (v) goto(`?date=${v}`);
    }}
    class="border-hairline bg-surface rounded-md border px-3 py-2"
  />
  <a
    href="?date={data.nextDate}"
    aria-label="Next day"
    class="border-hairline bg-surface text-ink-muted hover:text-ink rounded-md border px-3 py-2"
  >
    →
  </a>
  {#if !isToday}
    <a href="/meals" class="text-accent font-medium whitespace-nowrap">Back to today</a>
  {/if}
</div>
```

6c. Make the two section headings and the empty state date-aware:

- `<h2 class="font-semibold">Today's totals</h2>` → `<h2 class="font-semibold">{isToday ? "Today's totals" : `Totals · ${data.date}`}</h2>`
- `<h2 class="text-xl font-bold">Today's log</h2>` → `<h2 class="text-xl font-bold">{isToday ? "Today's log" : `Log · ${data.date}`}</h2>`
- `<p class="text-ink-muted text-sm">Nothing logged yet today.</p>` → `<p class="text-ink-muted text-sm">Nothing logged {isToday ? 'yet today' : `on ${data.date}`}.</p>`

6d. Carry the viewed date in both logging forms — insert as the first child of the `?/recipe` form AND of the `?/custom` form:

```svelte
    <input type="hidden" name="date" value={data.date} />
```

(The `?/delete` forms are id-scoped and need no date.)

- [ ] **Step 7: Accept a date in the weigh-in action**

In `src/routes/+page.server.ts`, change the dates import to `import { todayLocal, isValidDate, scheduledSessionFor } from '$lib/dates';` and replace the `weighin` action:

```ts
  weighin: async ({ request, locals }) => {
    const form = await request.formData();
    const weightKg = Number(form.get('weightKg'));
    const bfRaw = String(form.get('bodyFatPct') ?? '').trim();
    const today = todayLocal();
    const dateRaw = String(form.get('date') ?? '').trim();
    const date = dateRaw === '' ? today : dateRaw;
    if (!isValidDate(date) || date > today) {
      return fail(400, { error: 'Date must be a real day, today or earlier.' });
    }
    try {
      addBodyMetric(db, locals.user!.id, {
        date,
        weightKg,
        bodyFatPct: bfRaw === '' ? null : Number(bfRaw)
      });
    } catch {
      return fail(400, { error: 'Weight must be a positive number; body fat 0–100 or blank.' });
    }
    return { ok: true };
  }
```

- [ ] **Step 8: Add the date field to the weigh-in form**

In `src/routes/+page.svelte`, inside the `?/weighin` form, insert before the "Weight (kg)" label:

```svelte
    <label class="flex flex-col gap-1 text-sm">
      Date
      <input
        name="date"
        type="date"
        value={data.date}
        max={data.date}
        required
        class="border-hairline bg-surface rounded-md border px-3 py-2"
      />
    </label>
```

and change the footnote `Re-submitting today replaces today's entry.` → `Re-submitting a day replaces that day's entry.`

- [ ] **Step 9: Full verification**

Run: `npm test && npm run lint && npm run check`
Expected: all pass. (If prettier complains, run `npm run format` and re-check.)

- [ ] **Step 10: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts src/routes/meals src/routes/+page.server.ts src/routes/+page.svelte
git commit -m "feat: log meals and weigh-ins for any day, not just today"
```

---

### Task 2: Remove workout logging; `/workouts` becomes lookup-only

**Files:**
- Delete: `src/lib/server/workouts.ts`, `src/lib/server/workouts.test.ts`
- Modify: `src/lib/server/streaks.ts`, `src/lib/server/streaks.test.ts`
- Modify: `src/lib/server/db/schema.ts`, `src/lib/server/db/schema.test.ts`
- Create: `drizzle/0001_*.sql` via `npm run db:generate` (drops both workout tables)
- Modify: `src/routes/workouts/+page.server.ts`, `src/routes/workouts/+page.svelte`
- Modify: `src/routes/+page.server.ts`, `src/routes/+page.svelte`
- Modify: `src/routes/progress/+page.server.ts`, `src/routes/progress/+page.svelte`
- Modify: `scripts/reseed.ts`, `README.md`

**Interfaces:**
- Consumes: `shiftDate` from `$lib/dates` (produced by Task 1).
- Produces: `streaks.ts` exports only `mealStreak(db, userId, today)`. `workout_sessions` / `workout_sets` cease to exist — nothing may reference them afterwards.

- [ ] **Step 1: Update the tests that reference doomed code**

Replace `src/lib/server/streaks.test.ts` in full:

```ts
import { describe, it, expect } from 'vitest';
import { createTestDb } from './db/test-db';
import { users } from './db/schema';
import { logCustomMeal } from './meals';
import { mealStreak } from './streaks';

function setup() {
  const db = createTestDb();
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
```

In `src/lib/server/db/schema.test.ts`: change the schema import to `import { users, bodyMetrics, mealLogs } from './schema';` and delete the two workout tests (`'rejects two workout sessions of the same type on the same day'` and `'enforces the exercises FK on workout sets'`, including the trailing `void exercises;`). Keep `'round-trips a body metric'` and `'allows a meal log with a null recipeId and a customName'` unchanged.

- [ ] **Step 2: Delete the workout logging module and rewrite streaks**

```bash
git rm src/lib/server/workouts.ts src/lib/server/workouts.test.ts
```

Replace `src/lib/server/streaks.ts` in full:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from './db/connect';
import { mealLogs } from './db/schema';
import { shiftDate } from '../dates';

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
```

- [ ] **Step 3: Drop the tables from the schema**

In `src/lib/server/db/schema.ts`: delete the entire `workoutSessions` and `workoutSets` table definitions, and change the first line to

```ts
import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';
```

(`unique` was only used by `workoutSessions`.)

- [ ] **Step 4: Generate the drop migration**

Run: `npm run db:generate`
Expected: a new `drizzle/0001_*.sql` containing `DROP TABLE` for `workout_sets` and `workout_sessions`. `workout_sets` (the FK child) must be dropped **before** `workout_sessions`; if drizzle-kit emitted them in the other order, swap the two statements. Do not edit `drizzle/meta/` by hand.

- [ ] **Step 5: Run the affected tests**

Run: `npm test -- src/lib/server`
Expected: PASS — `createTestDb` applies the full migration chain including the new drop migration, so this also proves the migration executes cleanly.

- [ ] **Step 6: Convert the workouts route to lookup-only**

Replace `src/routes/workouts/+page.server.ts` in full:

```ts
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exercises } from '$lib/server/db/schema';
import { todayLocal, scheduledSessionFor, type SessionType } from '$lib/dates';
import type { PageServerLoad } from './$types';

const SESSION_TYPES: SessionType[] = ['push', 'pull', 'legs'];

export const load: PageServerLoad = async ({ url }) => {
  const date = todayLocal();
  const scheduled = scheduledSessionFor(date);
  const picked = url.searchParams.get('session');
  const sessionType = (SESSION_TYPES as string[]).includes(picked ?? '')
    ? (picked as SessionType)
    : (scheduled ?? 'push');

  return {
    date,
    scheduled,
    sessionType,
    exercises: db
      .select()
      .from(exercises)
      .where(eq(exercises.sessionType, sessionType))
      .orderBy(asc(exercises.displayOrder))
      .all()
  };
};
```

Replace `src/routes/workouts/+page.svelte` in full:

```svelte
<script lang="ts">
  import { weekdayOf } from '$lib/dates';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const SESSION_TYPES = ['push', 'pull', 'legs'] as const;
  const SESSION_LABELS: Record<string, string> = { push: 'Push', pull: 'Pull', legs: 'Legs' };

  function repsLabel(sets: number, repsMin: number, repsMax: number) {
    return repsMin === repsMax ? `${sets} × ${repsMin}` : `${sets} × ${repsMin}–${repsMax}`;
  }
</script>

<svelte:head><title>Workouts — health-me</title></svelte:head>

<h1 class="text-2xl font-bold">Workouts</h1>
<p class="text-ink-muted mt-1 text-sm">{data.date} · {weekdayOf(data.date)}</p>

{#if data.scheduled === null}
  <div class="bg-surface border-hairline mt-4 rounded-lg border p-4 text-sm">
    Rest day — optional 8-min home core (see <a href="/plan" class="text-accent font-medium">Plan</a
    >).
  </div>
{/if}

<!-- ============================= Session switcher ============================= -->
<nav class="mt-4 flex gap-2" aria-label="Session type">
  {#each SESSION_TYPES as type (type)}
    {@const isActive = data.sessionType === type}
    <a
      href="?session={type}"
      aria-current={isActive ? 'page' : undefined}
      class="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap {isActive
        ? 'bg-accent text-on-accent'
        : 'bg-surface border-hairline text-ink-muted hover:text-ink border'}"
    >
      {SESSION_LABELS[type]}{data.scheduled === type ? ' (today)' : ''}
    </a>
  {/each}
</nav>

<!-- ============================= Exercises ============================= -->
<section class="mt-6 flex flex-col gap-4">
  {#each data.exercises as exercise (exercise.id)}
    <div class="bg-surface border-hairline rounded-lg border p-4">
      <div class="flex items-baseline justify-between gap-2">
        <h2 class="font-semibold">{exercise.name}</h2>
        <span class="text-ink-muted text-sm whitespace-nowrap">
          {repsLabel(exercise.sets, exercise.repsMin, exercise.repsMax)}
        </span>
      </div>
      {#if exercise.dumbbellSwap}
        <p class="text-ink-muted text-sm">DB: {exercise.dumbbellSwap}</p>
      {/if}
    </div>
  {/each}
</section>
```

- [ ] **Step 7: Remove the week widget from dashboard and progress**

`src/routes/+page.server.ts`:
- `import { mealStreak, sessionsThisWeek } from '$lib/server/streaks';` → `import { mealStreak } from '$lib/server/streaks';`
- Delete the `week: sessionsThisWeek(db, locals.user!.id, date),` line from the load return.

`src/routes/+page.svelte`:
- Consistency card line `{data.streak}-day logging streak · {data.week.done}/{data.week.target} sessions this week` → `{data.streak}-day logging streak`
- Scheduled-session card copy `— log your session` → `— see today's exercises`

`src/routes/progress/+page.server.ts`:
- Same import change; delete the `week: sessionsThisWeek(db, locals.user!.id, date)` line (and the now-trailing comma on the `streak` line).

`src/routes/progress/+page.svelte`:
- Consistency line `{data.streak}-day logging streak · {data.week.done}/{data.week.target} sessions this week` → `{data.streak}-day logging streak`

- [ ] **Step 8: Update reseed script and README**

`scripts/reseed.ts`:
- Header comment lines 4–7 →

```
 * User data (meal logs, metrics, accounts) is NOT touched, but
 * meal_logs.recipe_id references these tables, so reseeding while logs
 * exist would orphan those FKs. In that case this refuses and tells you
 * to null out or migrate references first.
```

- `import { recipes, exercises, mealLogs, workoutSets } from '../src/lib/server/db/schema';` → `import { recipes, exercises, mealLogs } from '../src/lib/server/db/schema';`
- `const referencingLogs = count(mealLogs) + count(workoutSets);` → `const referencingLogs = count(mealLogs);`
- Error string `logged rows reference recipes/exercises.` → `logged rows reference recipes.`

`README.md`:
- "What this is" paragraph: `logging meals, weigh-ins, and workouts against a plan, with a dashboard summarizing progress over time.` → `logging meals and weigh-ins against a plan, looking up the day's workout, with a dashboard summarizing progress over time.`
- `TZ` table row: `Timezone used to determine "today" when logging meals/weigh-ins/workouts.` → `Timezone used to determine "today" when logging meals/weigh-ins.`
- Reseed intro: `but refuses if any meal/workout log already references the old rows` → `but refuses if any meal log already references the old rows`

- [ ] **Step 9: Sweep for stragglers**

Run: `grep -rn "workoutSessions\|workoutSets\|sessionsThisWeek\|weekBounds\|logSet\|getOrCreateSession\|lastSetsForExercise\|setsForSession\|deleteSet" src scripts`
Expected: no matches.

- [ ] **Step 10: Full verification**

Run: `npm test && npm run lint && npm run check`
Expected: all pass. (If prettier complains, run `npm run format` and re-check.)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat!: remove workout logging — /workouts is now a lookup page

Workout sets are tracked in a separate mobile app. Drops the
workout_sessions and workout_sets tables (migration 0001), deletes the
logging module and its widgets, and keeps the exercises reference data
powering the lookup UI."
```

---

## Deployment (after both tasks + review)

Push `main`; CI builds and publishes the image; the launchd updater pulls it within ~5 minutes. The drop-tables migration runs automatically at container start. Verify https://health.chenaners.com afterwards: meals page shows the date bar, weigh-in form has a date field, workouts page has no logging forms.
