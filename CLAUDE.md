# HealthMe — Agent Context

Self-hosted personal health tracking webapp. Single user, LAN-only.

## Stack
- Next.js 16 (App Router, TypeScript) + Tailwind v4 + shadcn/ui
- Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3` (file in `data/db/`)
- Ollama sidecar with `qwen2.5vl:7b` vision model for RENPHO OCR
- Vitest (unit + integration), Playwright (optional E2E)
- Docker Compose: `web` + `ollama` containers

## Key paths
- Spec: `docs/superpowers/specs/2026-04-24-healthme-design.md`
- Plan: `docs/superpowers/plans/2026-04-24-healthme.md`
- Schema: `prisma/schema.prisma`
- API routes: `src/app/api/`
- Domain lib: `src/lib/` (regression, ocr-client, etc — all pure functions, easy to test)
- UI components: `src/components/` (ink-brush aesthetic)

## Running
- Dev: `npm run dev`
- Full stack: `docker compose up -d` (web reachable at `http://localhost:3000`)
- Tests: `npm test`
- Prisma migration: `npx prisma migrate dev --name <name>`
- Prisma Studio: `npx prisma studio`

## Visual conventions
- Font: Courier New everywhere
- Theme tokens defined in `src/app/globals.css` as CSS custom props
- Light = washi paper (`#f4ecd8`), dark = ink wash (`#1a1612`)
- Red accent (seal ink), green accent (moss)
- Chinese accents: 光/暗 on theme toggle, 垚 on seal chop
- Brush-edge effect via shared SVG filter (`#rough`) in `src/components/ink-filter.tsx`

## Trust boundary
- LAN-only, no auth, no HTTPS
- iOS Shortcut POSTs daily active kcal to `/api/activity` (no auth token)

## Data flow
- RENPHO photo upload → `/api/metrics/photo` (OCR via Ollama) → review form → `/api/metrics` (save)
- Apple Health → iOS Shortcut → POST `/api/activity`
- Trajectory = linear regression on last N days of chosen metric, projected forward
- Goals = per-metric targets with date; dashboard shows on-track/off-track delta

## Non-goals
- Multi-user, auth, public exposure
- Water/steps/workout tracking
- Ingredient-level recipes

## Config quirks
- `vitest.config.mts` (not `.ts`) — avoids ERR_REQUIRE_ESM on Node 22 with Vitest 4 + std-env
- shadcn uses `sonner` primitive (toast deprecated in shadcn 4.x)
- Prisma 7: datasource url lives in `prisma.config.ts` only (not `schema.prisma`). All PrismaClient instances need `adapter: new PrismaBetterSqlite3({ url })`.
- Requires Node 20.19+ or 22.12+. Docker base is `node:22-alpine` with python/make/g++ for `better-sqlite3` native build.
