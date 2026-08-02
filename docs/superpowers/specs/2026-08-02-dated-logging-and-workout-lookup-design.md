# Dated Logging + Workout Lookup — Design

**Date:** 2026-08-02
**Status:** Approved

Two changes to the deployed tracker:

1. Meals and weigh-ins can be logged for days other than today.
2. Workout logging is removed entirely — the user logs workouts in a separate
   mobile app. `/workouts` becomes a read-only lookup page ("what do I do
   today"), and every trace of set logging (UI, server module, DB tables,
   dashboard widgets) is deleted.

## 1. Dated logging

### Meals (`/meals`)

- The page becomes date-addressable: `?date=YYYY-MM-DD`. Missing or invalid →
  today. Any date is allowed, past or future (future is useful for planning).
- A date bar under the heading:
  - `←` / `→` links to the previous/next day (preserving nothing else — the
    page has no other query state).
  - A native `<input type="date">` that navigates on change.
  - When the viewed date is not today, the bar shows a "Back to today" link
    and the page headings say the date instead of "Today's".
- The `recipe` and `custom` form actions log to the *viewed* date, carried in
  a hidden `date` field. Server-side the field is validated with the same
  helper; invalid → `fail(400)`. The `delete` action is unchanged (id-scoped).
- `mealsForDate` / `dayTotals` / `logRecipeMeal` / `logCustomMeal` already
  take a date — no data-layer changes.

### Weigh-ins (dashboard `/`)

- The weigh-in form gains a `<input type="date">`, default today, `max` today.
- The `weighin` action reads the date field, validates format, and rejects
  dates after today (a future scale reading is fake data that would pollute
  the trend charts). `addBodyMetric` already upserts one-entry-per-day, so
  backfilling replaces that day's point and charts follow automatically.
- The rest of the dashboard (totals, streak, "Today" heading) stays pinned to
  today.

### Shared validation

- New `isValidDate(s: string): boolean` in `src/lib/dates.ts`: strict
  `YYYY-MM-DD` shape **and** a real calendar date (`2026-02-30` rejected),
  unit-tested. Used by both routes so route code stays thin.

## 2. Remove workout logging

### What `/workouts` becomes

A read-only reference: the push/pull/legs switcher, the "(today)" marker on
the scheduled session, the rest-day note, and per-exercise cards showing name,
sets × reps, and the dumbbell swap. Removed: weight/reps forms, logged-set
chips, "last time" hints, all form actions.

### Deletions

- `src/lib/server/workouts.ts` and `workouts.test.ts` — deleted.
- `sessionsThisWeek` and `weekBounds` from `streaks.ts` (and their tests) —
  `weekBounds`'s only consumer was `sessionsThisWeek`.
- `workoutSessions` and `workoutSets` tables from `schema.ts`, their tests in
  `schema.test.ts`, and a new generated migration that **drops both tables**.
  Any previously logged sets are discarded — accepted, since real workout
  logging lives in the mobile app.
- Dashboard: the "N/3 sessions this week" half of the Consistency card; the
  scheduled-session card's copy changes from "log your session" to "see
  today's exercises". Same removal on `/progress`.
- `scripts/reseed.ts`: drop the `workout_sets` half of its FK-safety check.
- `README.md`: remove workout-logging claims from the description and env
  table.

### Kept

The `exercises` table and its seed data (they power the lookup page and
`/plan`), `scheduledSessionFor`, the nav link, the `/plan` page.

## Testing

- `isValidDate`: valid, malformed, and impossible-calendar cases.
- Existing suites updated where they reference deleted code; everything else
  unchanged. Full `npm test` + `npm run check` + `npm run lint` must pass.

## Migration note

The drop-tables migration runs automatically at container start (connect.ts
migrates on boot), so deployment is the normal push → CI image → auto-update
pull. No manual DB step.
