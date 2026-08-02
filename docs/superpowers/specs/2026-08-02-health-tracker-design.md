# Health Tracker — Design

Date: 2026-08-02

## Purpose

A personal, single-user health/fitness tracker. Replaces ad-hoc tracking (or no tracking) of an
existing fat-loss program (`fat-loss-program.md`, sourced from a smart-scale-driven nutrition +
training plan). The app is the primary place to:

- Look up the nutrition plan (recipes, targets, snacks) and training plan (exercises, schedule)
- Log meals eaten (by picking a plan recipe/option, or a custom entry)
- Log body weight (kg) and body fat % from a smart scale
- Log actual workout performance (weight × reps per exercise) to drive progressive overload
- See progress: macro tracking for today, weight/body-fat trend, logging streaks

Not in scope: multi-user support, a food database/barcode lookup, editing the plan itself through
the UI (the plan is edited as source data and reseeded), notifications/reminders, native mobile
app (responsive web only).

## Architecture

Mirrors the conventions of the sibling project `learn-japanese`
(`/Users/chenanigans/Hosted/learn-japanese`), since both are personal apps self-hosted on the same
Mac behind the same Cloudflare Tunnel + Homebrew nginx setup.

- **Framework**: SvelteKit 2 + Svelte 5, TypeScript, `@sveltejs/adapter-node` (self-hosted Node
  server)
- **Styling**: Tailwind CSS 4
- **Database**: SQLite via `better-sqlite3` + Drizzle ORM (`drizzle-kit` for migrations)
- **Auth**: Single-user session-cookie auth, argon2-hashed password (`@node-rs/argon2`) — same
  pattern as learn-japanese's login/logout, but permanently one account. No self-registration; the
  account is created via a one-off script (e.g. `scripts/create-user.ts`), matching
  learn-japanese's `create-user`/`set-password` script pattern.
- **Package manager**: npm, Node 22 (`engine-strict=true` in `.npmrc`)
- Single monolith app — SvelteKit routes serve both pages and JSON/form-action endpoints. No
  separate backend service.

Considered and rejected: raw SQL via better-sqlite3 instead of Drizzle. Fewer dependencies, but
loses migration tooling and typed queries for no real benefit at this scale — Drizzle matches
learn-japanese and is kept.

## Data model

### Reference data (seeded, not user-editable via UI)

Transcribed from `fat-loss-program.md` into a structured TS seed file, loaded by
`scripts/seed.ts` (re-run via a reseed script whenever the source plan changes) — mirrors
learn-japanese's curriculum-seed pattern.

- **`recipes`** — code (e.g. `R1`, `D3`, or a slug for uncoded breakfast options), meal type
  (breakfast / lunch / dinner / snack), name, kcal, protein_g, ingredients text, instructions text
- **`exercises`** — session type (Push / Pull / Legs), name, machine variant, dumbbell variant,
  sets × reps target range, display order

### User data

- **`user`** — id, username, password_hash (single row)
- **`session`** — id, user_id, expires_at
- **`body_metrics`** — id, user_id, date, weight_kg, body_fat_pct, logged_at
- **`meal_logs`** — id, user_id, date, meal_slot, recipe_id (nullable, FK to `recipes`),
  custom_name (nullable), kcal, protein_g, logged_at. Exactly one of `recipe_id` /
  `custom_name` is set per row — a recipe pick or a custom entry, never both.
  kcal/protein_g are **snapshotted at log time** (copied from the recipe or entered manually for
  custom meals), so editing a recipe's macros later doesn't retroactively rewrite history.
- **`workout_sessions`** — id, user_id, date, session_type (Push/Pull/Legs), completed_at
- **`workout_sets`** — id, workout_session_id (FK), exercise_id (FK), set_number, weight_kg, reps.
  Powers "show my last logged weight × reps for this exercise" while mid-workout.

## Pages

- **`/login`** — single-account login
- **`/` (dashboard)** — today's macro progress bar (logged kcal/protein vs. the plan's ~1,750
  kcal / 150 g+ protein targets), weight trend chart with 7-day rolling average, logging streak,
  quick links to log a meal / weigh-in / workout
- **`/meals`** — log today's food: pick a meal slot → pick a recipe (R1–R4, D1–D6, breakfast
  options) or "custom" (name + kcal + protein) → running daily total updates live
- **`/plan`** — read-only reference view of the full nutrition + training plan (daily targets, all
  recipes with ingredients/instructions, snacks, shopping list, golden rules, exercise tables) —
  `fat-loss-program.md` rendered as a browsable page, sourced from the same seed data as `/meals`
  and `/workouts` so the reference view and the loggable options never drift apart
- **`/workouts`** — today's scheduled session if it's a training day (Mon/Wed/Fri per the plan),
  log weight × reps per exercise, shows the last logged numbers for that exercise inline
- **`/progress`** — weight/body-fat history chart + weekly average (the plan explicitly says to
  judge by weekly average, not daily swings), streaks (days logged, sessions completed vs. the
  Mon/Wed/Fri schedule)

## Progress/streak logic

- Weekly average weight: mean of `body_metrics` entries in the trailing 7 days, recalculated per
  entry — matches the plan's "weigh 3×/week, judge the weekly average" guidance.
- Logging streak: consecutive days with at least one `meal_logs` entry.
- Workout adherence: `workout_sessions` completed this week vs. the 3 scheduled (Mon/Wed/Fri).

## Deployment

Same pull-based CD pipeline as learn-japanese, as a new instance of each piece:

- CI builds a `linux/arm64` Docker image → GHCR: `ghcr.io/chenophobia/health-me:latest`
  (+ `sha-*` tags)
- `deploy/compose.yml` pulls that image (mirrors learn-japanese's `deploy/compose.yml`)
- `deploy/update.sh` polls GHCR every 5 minutes, redeploys only on image change
- A new launchd agent (`com.chenophobia.health-me.update.plist`, `__REPO__`-substitution
  template) runs the poller, `StartInterval: 300`
- Container binds `127.0.0.1:<port>` only. The exact port is picked at implementation time by
  checking the host's existing Homebrew nginx configs / launchd plists, to avoid colliding with
  learn-japanese (3001/8089) or other sibling apps.
- A new Homebrew nginx server block proxies that port; a new Cloudflare Tunnel ingress rule routes
  `health.chenaners.com` to it.
- **Open question for implementation**: the user has already created a CNAME for
  `health.chenaners.com` in Cloudflare. Cloudflare Tunnel hostnames are normally provisioned via
  `cloudflared tunnel route dns <tunnel-id> <hostname>`, which creates a CNAME to
  `<tunnel-id>.cfargotunnel.com` — not a manually created record. This needs to be checked against
  the actual tunnel config on the host before wiring the ingress rule, and flagged if it doesn't
  match what routing expects.

## CI

Same three GitHub Actions workflows as learn-japanese, retargeted to this repo:

- **`ci.yml`** — `checks` job (`npm ci` → lint → `svelte-check` → `vitest` → build), then
  `docker` job on `ubuntu-24.04-arm`, pushing to GHCR on non-PR events, GHA layer caching
- **`codeql.yml`** — JS/TS scan, push/PR to `main` + weekly schedule
- **`dependabot-auto-merge.yml`** + grouped weekly `dependabot.yml` (npm, github-actions, docker)

## Testing

- Vitest for logic worth unit-testing: macro-total math, streak/weekly-average calculation, and
  seed-data integrity (every recipe/exercise referenced by the UI exists in the seed, every
  recipe code is unique)
- `svelte-check` for type checking
- `prettier --check . && eslint .` as the single lint gate (same command CI runs), same
  ESLint flat config + Prettier config shape as learn-japanese

## Env/config

`.env.example` checked in with inline comments per variable (`SESSION_SECRET`, `DATA_DIR`, etc.),
mirrored in a README "Environment variables" table — same convention as learn-japanese.
