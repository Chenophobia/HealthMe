# HealthMe

Self-hosted personal health tracking webapp. Single user. Runs in Docker on macOS. Tracks body composition from RENPHO smart-scale screenshots (via local Ollama vision OCR), logs meals & macros, imports Apple Health active calories via iOS Shortcut, and projects body-composition trajectories against editable per-metric goals.

Visual style: Chinese ink-brush on washi paper with light / dark themes. Courier New typography. 垚 seal chop.

## Architecture

Two-container docker-compose stack.

```
┌─────────────────────┐    ┌──────────────────────┐
│  web                │    │  ollama (sidecar)    │
│  Next.js 16         │◄──►│  qwen2-vl:7b         │
│  Prisma + SQLite    │    │  Vision OCR          │
│  TypeScript         │    │                      │
│  Tailwind+shadcn/ui │    │                      │
└─────────┬───────────┘    └──────────────────────┘
          │
   LAN :3000
          │
┌─────────▼───────────────┐
│  Mac host / phone / etc │
└─────────────────────────┘
```

### Data flow
- **Body metrics:** RENPHO photo → `POST /api/metrics/photo` → Ollama extracts values → review UI → `POST /api/metrics` saves row.
- **Meals:** recipe pick / quick entry / copy-from-yesterday → `POST /api/meals`.
- **Activity:** iOS Shortcut reads Apple Health active kcal → `POST /api/activity`.
- **Trajectory:** `POST /api/metrics/predict` runs linear regression on last 60 days, projects forward.
- **Goals:** per-metric targets with date; UI overlays projection vs goal delta.

### Trust boundary
LAN-only. No authentication, no HTTPS. iOS Shortcut posts without a token. Not safe to expose publicly without adding auth.

## Setup

### Requirements
- macOS with Docker Desktop
- ~5 GB free disk for the vision model
- iOS device for Shortcut integration (optional)

### First run

```bash
git clone https://github.com/Chenophobia/HealthMe.git
cd HealthMe
cp .env.example .env   # adjust APP_TZ if not America/New_York
docker compose up -d --build
docker compose exec ollama ollama pull qwen2-vl:7b
```

Webapp is now at `http://localhost:3000` (and `http://<mac>.local:3000` from phone).

### iOS Shortcut recipe

Create a new Shortcut with:
1. **Get Active Energy** for "today"
2. **Get Contents of URL** → `http://<mac>.local:3000/api/activity`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "date": "{today YYYY-MM-DD}",
       "activeKcal": {active energy kcal},
       "source": "SHORTCUT"
     }
     ```

Tip: add a personal automation so it runs daily at 23:00.

### Development

```bash
npm install
npx prisma migrate dev
npm run dev
```

Dev server at `http://localhost:3000`. Use `npm test` for Vitest.

## Key paths

| Path | Purpose |
|---|---|
| `src/app/` | Next.js App Router pages |
| `src/app/api/` | API routes |
| `src/components/` | Ink-brush UI primitives |
| `src/lib/` | Pure domain logic (regression, OCR client, date utils) |
| `prisma/schema.prisma` | Data model |
| `docs/superpowers/specs/` | Design spec |
| `docs/superpowers/plans/` | Implementation plan |
| `CLAUDE.md` | Agent context for future sessions |
| `data/` | Runtime volume (git-ignored) — SQLite, photos |

## Non-goals

- Multi-user or authentication
- Public internet exposure
- Water / steps / workout tracking
- Ingredient-level recipe decomposition
- Nutrition database (all recipe macros entered manually)

## License

MIT
