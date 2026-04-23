# HealthMe — Design Spec

**Date:** 2026-04-24
**Author:** Yao Chen
**Status:** Approved for implementation planning

## Purpose

Self-hosted personal health tracking webapp running in Docker on macOS. Single user. Ingests RENPHO smart-scale screenshots via local vision OCR, tracks meals/macros via recipe library and quick entries, imports Apple Health active-calorie totals via iOS Shortcut, and projects body-composition trajectories against editable goals. Dashboard aesthetic: Chinese ink-brush on washi paper with light/dark themes.

## Success Criteria

- Upload a RENPHO screenshot, review parsed values, save to history in under 30 seconds.
- Log a full day of meals (4 slots) from saved recipes in under 1 minute.
- iOS Shortcut POSTs daily active kcal from Apple Health with no manual steps once configured.
- Dashboard shows current weight / body fat / skeletal muscle / BMI with 30-day trajectory projection toggled on/off.
- Goals (e.g., body fat 20% by target date) show trajectory-vs-goal delta in real time.
- Light/dark theme toggle persists across sessions.
- All data stays on local machine.

## Out of Scope

- Multi-user / authentication
- Water tracking, step tracking, workout logging
- Ingredient-level recipe decomposition or per-ingredient macros
- Public internet exposure (LAN-only)
- Goal-driven meal planning or calorie target recommendations
- Non-RENPHO scale formats

## Architecture

Two-container docker-compose stack:

```
web (Next.js 15 App Router + TypeScript)
  ├── UI pages (React Server Components + Client Components)
  ├── API routes (/api/*)
  ├── Prisma ORM → SQLite
  └── HTTP client → ollama:11434
ollama (ollama/ollama image)
  └── Vision model: qwen2-vl:7b (pulled on first run)
```

**Volumes:**
- `./data/db` → SQLite file (persists user data)
- `./data/uploads` → RENPHO photo archive (keep originals for re-parsing if model upgrades)
- `ollama-models` → named volume for model weights (~4 GB)

**Ports:**
- `web` → `0.0.0.0:3000` (LAN-reachable, phone connects via `http://<mac>.local:3000`)
- `ollama` → internal network only

**Deployment:** `docker compose up -d` on macOS. First run pulls qwen2-vl model (slow, one-time). No reverse proxy, no auth, no HTTPS — trust boundary is the home network.

**Rationale:** Single user, local-only, simplest possible stack. Ollama as sidecar isolates model weights from app rebuilds and lets the model swap independently.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui primitives (restyled for ink-brush aesthetic) + custom CSS layers for washi textures
- **Fonts:** Courier New (body/headings), system CJK fallback stack for Chinese characters
- **Typography palette:** seal-red accent (`#8b2a2a` light / `#d85050` dark), moss-green positive (`#3a5a3a` / `#7ab07a`), washi-paper background (`#f4ecd8`), ink-wash dark (`#1a1612`)
- **ORM:** Prisma 5 with SQLite provider
- **Vision OCR:** Ollama running `qwen2-vl:7b` via HTTP (`/api/generate`)
- **Charts:** Recharts or Visx, with SVG `feTurbulence` + `feDisplacementMap` filter applied to stroke paths for rough brush edges
- **Motion:** Framer Motion for brush-reveal animations on page transitions
- **Testing:** Vitest (unit/integration), Playwright (optional E2E)
- **Container:** Docker + docker-compose v2

## Data Model (Prisma)

```prisma
model User {
  id         Int      @id @default(autoincrement())
  name       String
  heightCm   Float
  dob        DateTime
  createdAt  DateTime @default(now())
}

model BodyMetric {
  id                    Int      @id @default(autoincrement())
  capturedAt            DateTime
  weightKg              Float?
  bmi                   Float?
  bodyFatPct            Float?
  bodyFatKg             Float?
  skeletalMuscleKg      Float?
  skeletalMusclePct     Float?
  subcutaneousFatPct    Float?
  bmrKcal               Int?
  metabolicAge          Int?
  fatFreeMassKg         Float?
  visceralFat           Float?
  bodyWaterKg           Float?
  bodyWaterPct          Float?
  muscleMassKg          Float?
  muscleMassPct         Float?
  boneMassKg            Float?
  boneMassPct           Float?
  proteinKg             Float?
  proteinPct            Float?
  source                MetricSource
  photoPath             String?
  rawOcrJson            String?
  createdAt             DateTime @default(now())
}

enum MetricSource { PHOTO MANUAL }

model Recipe {
  id         Int      @id @default(autoincrement())
  name       String
  kcal       Int
  proteinG   Float
  carbsG     Float
  fatG       Float
  servings   Float    @default(1)
  notes      String?
  createdAt  DateTime @default(now())
  mealLogs   MealLog[]
}

model MealLog {
  id           Int      @id @default(autoincrement())
  consumedAt   DateTime    // normalized to midnight in user's local timezone
  slot         MealSlot
  recipeId     Int?
  recipe       Recipe?  @relation(fields: [recipeId], references: [id])
  servings     Float?   // when recipeId set
  quickName    String?
  quickKcal    Int?
  quickProteinG Float?
  quickCarbsG  Float?
  quickFatG    Float?
  createdAt    DateTime @default(now())
}

enum MealSlot { BREAKFAST LUNCH SNACK DINNER }

model ActivityLog {
  id         Int      @id @default(autoincrement())
  loggedAt   DateTime    // normalized to midnight in user's local timezone
  activeKcal Int
  source     ActivitySource
  createdAt  DateTime @default(now())
  @@unique([loggedAt, source])
}

enum ActivitySource { SHORTCUT MANUAL }

model Goal {
  id           Int      @id @default(autoincrement())
  metric       GoalMetric
  targetValue  Float
  targetDate   DateTime
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
}

enum GoalMetric {
  WEIGHT_KG BODY_FAT_PCT SKELETAL_MUSCLE_KG
  BMI MUSCLE_MASS_KG VISCERAL_FAT
}
```

**Invariants:**
- `MealLog` row references EITHER `recipeId`+`servings` OR the `quick*` fields — never both populated, never both null.
- `ActivityLog` is unique per `(loggedAt, source)` to prevent Shortcut double-posting same day.
- Setting a new goal for a metric deactivates all prior active goals for that metric (history retained via `active=false`).

## API Routes

```
POST /api/metrics/photo       multipart upload → parsed preview (no save)
POST /api/metrics             save reviewed metric row
GET  /api/metrics?range=30d   timeseries (range: 7d|30d|90d|365d|all)
POST /api/metrics/predict     body { metric, horizonDays } → { slope, intercept, projected }

GET  /api/recipes             list all
POST /api/recipes             create
PUT  /api/recipes/:id         update
DELETE /api/recipes/:id

GET  /api/meals?date=YYYY-MM-DD
POST /api/meals               { date, slot, recipeId, servings } OR { date, slot, quick{...} }
DELETE /api/meals/:id
POST /api/meals/copy          { fromDate, toDate } copies all slots

POST /api/activity            { date, activeKcal, source } — Shortcut endpoint
GET  /api/activity?range=30d

GET  /api/goals               active + history
POST /api/goals               deactivate prior active for same metric, insert new
DELETE /api/goals/:id         archive (sets active=false)
```

### OCR pipeline (`POST /api/metrics/photo`)

1. Receive multipart upload, validate `<10 MB` and `image/*` MIME.
2. Save original to `data/uploads/<uuid>.<ext>`, record path.
3. Read file, base64-encode, POST to `http://ollama:11434/api/generate`:
   ```json
   {
     "model": "qwen2-vl:7b",
     "prompt": "<extraction prompt specifying RENPHO layout, return JSON>",
     "images": ["<base64>"],
     "format": "json",
     "stream": false
   }
   ```
4. Parse model's JSON response against expected schema (13 optional fields).
5. Return `{ preview: {...parsed fields}, photoPath, rawOcrJson }` to client.
6. Client renders review form. On confirm, client POSTs to `/api/metrics` with final values + `photoPath` + `rawOcrJson`.

### Shortcut endpoint (`POST /api/activity`)

- iOS Shortcut reads Apple Health active energy for "today", POSTs JSON.
- No authentication — LAN-only trust boundary.
- Response includes `{ ok: true, id }` so Shortcut can show confirmation.

### Trajectory prediction (`POST /api/metrics/predict`)

- Query all `BodyMetric` rows for requested metric within last N days (default 30, configurable).
- Fit linear regression on (daysFromStart, value) points.
- Return slope (units/day), intercept, and projected values at specified horizon.
- If fewer than 3 data points: return `{ error: "insufficient_data" }`.

## Pages & Navigation

**Top nav (all pages):** Dashboard · Metrics · Meals · Recipes · Goals · Settings · [光/暗 theme toggle]

### `/` Dashboard
- **Top row:** daily calorie bar (intake vs BMR+active, net deficit/surplus, % ring, "+ Log Meal" CTA)
- **Metric grid (2×2):** Weight, Body Fat %, Skeletal Muscle, BMI cards with sparkline + week delta
- **Trajectory toggle** (full-width row): when on, sparklines show dashed-red projection line; goal line overlays dashed-green where goal exists
- **Capture RENPHO** quick-action button
- **"All Metrics ▾"** expandable section for remaining 9 RENPHO values

### `/metrics` Body Metrics
- Metric-picker dropdown exposes all 13 RENPHO fields (goal overlay only available for the 6 metrics covered by `GoalMetric` enum)
- Range selector (7/30/90/365d/all)
- Large chart w/ optional projection + goal overlay
- Table of raw entries below — click row to edit (values editable) or delete
- "+ Capture RENPHO" → routes to `/metrics/capture`

### `/metrics/capture`
- Drag-drop upload zone (desktop) + camera input (mobile `<input type="file" accept="image/*" capture>`)
- Upload → loading spinner during OCR
- Review form: parsed values editable, original photo rendered side-by-side
- Buttons: Save · Retry (re-OCR same photo) · Cancel (discard)

### `/meals`
- Date picker (default: today)
- Four slot cards: Breakfast · Lunch · Snack · Dinner
- Each slot lists entries (name, kcal, macros) + [+ Add] button
- Add modal tabs:
  - **Pick recipe** — searchable library, set servings (default 1)
  - **Quick entry** — name + kcal + protein/carbs/fat fields, optional "save as recipe"
  - **Copy from yesterday** — one-click copy of same slot from prior day
- Day totals footer: kcal + macro bars vs day's activity

### `/recipes`
- Card grid: name, kcal, P/C/F chips, serving count, actions (edit, delete)
- Search by name
- [+ New recipe] → form modal (name, servings, kcal, protein_g, carbs_g, fat_g, notes)

### `/goals`
- Active goals list: metric, target value, target date, current value, projected value on target date, delta (on track / off track)
- [+ New goal] form (metric dropdown, target value, target date)
- History section (read-only, archived goals)

### `/settings`
- Profile: name, height, dob
- Theme: Light / Dark / System
- Data: export DB (SQLite file download), import DB (upload replaces)

## Visual Design

**Aesthetic:** Chinese ink-brush on washi paper. English labels only, Chinese characters used as decorative accents (theme toggle 光/暗, chop 垚).

**Typography:** Courier New throughout, monospace body gives utilitarian "field journal" feel that complements the brush accents.

**Light theme ("washi"):**
- Background `#f4ecd8` (aged paper) with subtle radial gradients
- Card surface `#ebe0c4`
- Ink text `#1a1410`, soft ink `#4a3e32`, faded `#8a7a68`
- Accent (seal red) `#8b2a2a`, positive (moss green) `#3a5a3a`
- Dividers: 15% ink alpha

**Dark theme ("ink wash"):**
- Background `#1a1612` (deep ink)
- Card surface `#23201a`
- Text `#e8dcc2`, soft `#c4b392`, faded `#8a7a60`
- Accent `#d85050`, positive `#7ab07a`

**Ink brush effects:**
- SVG filter `feTurbulence baseFrequency=0.8 numOctaves=2` + `feDisplacementMap scale=1.5` applied to chart stroke paths for rough brush edges
- Vermillion seal-chop (垚 character, rotated −6°) in dashboard bottom-right
- Brush-stroke underline on active nav item
- Dashed projection line (4 3 pattern), dashed goal line (2 4 pattern)
- Framer Motion stroke-reveal on initial page load for charts

## Error Handling

| Situation | Behavior |
|-----------|----------|
| Ollama timeout / malformed JSON / missing fields | Auto-retry once. If still fails: show original photo + blank editable form, log raw output to `rawOcrJson`. |
| Photo > 10 MB or non-image MIME | Client validates and rejects; server returns 400. |
| Shortcut POST malformed | 400 with specific field-level errors. Never 500 on bad input. |
| Duplicate metric same day | Allow multiple rows. Dashboard shows latest; chart shows all points. |
| Trajectory with <3 data points | Hide projection line, render "need 3+ data points" hint. |
| Goal already reached / target date past | Show "goal reached" badge; user can archive or set new. |
| SQLite locked / corrupt | Error boundary page suggests `docker compose restart`. |
| Ollama container down | `/api/metrics/photo` returns 503; UI falls back to "upload photo, fill manually". |

## Testing Strategy

**Unit (Vitest):**
- Trajectory linear-regression math (given fixed points → expected slope/intercept/projections)
- Goal-vs-projection delta calculation (on-track / off-track logic)
- OCR response parser (golden test fixtures: valid JSON, malformed JSON, partial fields, wrong units)
- Recipe serving scaler (given recipe + servings → scaled macros)

**Integration (Vitest + ephemeral SQLite):**
- Each API route CRUD happy path
- Meal slot constraints (`recipeId` vs `quick*` mutual exclusion)
- Goal activation (new goal deactivates prior for same metric)
- Shortcut endpoint: valid + invalid payloads, unique constraint behavior

**E2E (Playwright, optional):**
- Photo upload → review → save flow (mock Ollama response)
- Full day meal-log flow: pick recipe, quick-entry, copy-yesterday

**Manual smoke checks:**
- Real RENPHO screenshot through real Ollama — once per model change
- iOS Shortcut end-to-end from phone to web UI

## Repository Structure

Standard Next.js layout (no ICM stage folders — ICM is a workflow framework, not a codebase layout):

```
HealthMe/
├── README.md                     # architecture + setup (to be written)
├── CLAUDE.md                     # agent-facing guide for token-efficient future sessions
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── metrics/
│   │   ├── meals/
│   │   ├── recipes/
│   │   ├── goals/
│   │   ├── settings/
│   │   └── api/                  # API routes
│   ├── components/               # shared UI (cards, charts, ink-brush primitives)
│   ├── lib/                      # domain logic (regression, ocr-client, prisma singleton)
│   ├── styles/                   # globals + ink-brush theme tokens
│   └── types/
├── data/                         # runtime — git-ignored
│   ├── db/
│   └── uploads/
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Git:** Initialize repo, add remote `origin = https://github.com/Chenophobia/HealthMe.git`. Initial commit contains spec + README + scaffolding.

## Deferred / Future Considerations

- Ingredient-level recipes if single-recipe-macros proves too coarse
- Multi-user + auth if app ever needs to leave LAN
- Streaming OCR responses if model latency degrades UX
- Replace linear regression with EWMA or ARIMA once enough data collected to evaluate
- Export to CSV for external analysis

## Approval

Design discussed and approved through iterative brainstorming session on 2026-04-24.
