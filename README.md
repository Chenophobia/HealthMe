# HealthMe

Self-hosted personal health tracking webapp. Single user. Runs in Docker on macOS, Linux, or Windows. Tracks body composition from RENPHO smart-scale screenshots (via local Ollama vision OCR), logs meals & macros, imports Apple Health active calories via iOS Shortcut, and projects body-composition trajectories against editable per-metric goals.

Visual style: Chinese ink-brush on washi paper with light / dark themes. Courier New typography. 垚 seal chop.

## Architecture

Two-container docker-compose stack.

```text
┌─────────────────────┐    ┌──────────────────────┐
│  web                │    │  ollama (sidecar)    │
│  Next.js 16         │◄──►│  qwen2.5vl:7b        │
│  Prisma 7 + SQLite  │    │  Vision OCR          │
│  TypeScript         │    │                      │
│  Tailwind+shadcn/ui │    │                      │
└─────────┬───────────┘    └──────────────────────┘
          │
   LAN :3000
          │
┌─────────▼─────────────────┐
│  host / phone / tablet... │
└───────────────────────────┘
```

### Data flow

- **Body metrics:** RENPHO photo → `POST /api/metrics/photo` → Ollama extracts values → review UI → `POST /api/metrics` saves row.
- **Meals:** recipe pick / quick entry / copy-from-yesterday → `POST /api/meals`.
- **Activity:** iOS Shortcut reads Apple Health active kcal → `POST /api/activity`.
- **Trajectory:** `POST /api/metrics/predict` runs linear regression on last 60 days, projects forward.
- **Goals:** per-metric targets with date; UI overlays projection vs goal delta.

### Trust boundary

LAN-only. No authentication, no HTTPS. iOS Shortcut posts without a token. Not safe to expose publicly without adding auth.

## Requirements

- **Docker + Docker Compose v2** (`docker compose ...`, not `docker-compose`)
- **~8 GB free disk** for the Ollama vision model (~6 GB) + images/build cache
- **16 GB RAM recommended** (vision model inference is memory-hungry)
- **iOS device** for Shortcut integration (optional)

## Install & Run

### macOS

1. Install Docker Desktop: <https://www.docker.com/products/docker-desktop/> (Apple Silicon or Intel). Launch it and wait until the whale icon in the menu bar is steady.
2. In Docker Desktop → Settings → Resources, give it at least 8 GB RAM.
3. Clone and start:

```bash
git clone https://github.com/Chenophobia/HealthMe.git
cd HealthMe
cp .env.example .env
docker compose up -d --build
docker compose exec ollama ollama pull qwen2.5vl:7b
```

4. Open `http://localhost:3000`. From iPhone on the same Wi-Fi: `http://<your-mac-name>.local:3000` (find name via `scutil --get LocalHostName`).

### Linux

Docker Engine (no Docker Desktop needed).

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"        # log out / back in for group to take effect
sudo systemctl enable --now docker

# Arch
sudo pacman -S docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

# Fedora
sudo dnf install docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Then:

```bash
git clone https://github.com/Chenophobia/HealthMe.git
cd HealthMe
cp .env.example .env
docker compose up -d --build
docker compose exec ollama ollama pull qwen2.5vl:7b
```

Open `http://localhost:3000`. From phone on same network: `http://<server-lan-ip>:3000` (find with `ip -4 addr show` or `hostname -I`).

**GPU acceleration (optional, Linux only):** install `nvidia-container-toolkit`, then edit `docker-compose.yml` `ollama` service to add:

```yaml
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: ["gpu"]
```

### Windows (WSL2 recommended)

1. Enable WSL2 + Ubuntu: `wsl --install` in an Admin PowerShell. Reboot.
2. Install Docker Desktop for Windows and enable the WSL2 integration (Settings → Resources → WSL Integration → toggle on your Ubuntu distro).
3. Open Ubuntu (Start menu → "Ubuntu"). Inside WSL shell:

```bash
git clone https://github.com/Chenophobia/HealthMe.git
cd HealthMe
cp .env.example .env
docker compose up -d --build
docker compose exec ollama ollama pull qwen2.5vl:7b
```

4. Open `http://localhost:3000` in any Windows browser (WSL auto-forwards). From phone on same Wi-Fi: use the Windows machine's LAN IP — find it in PowerShell via `ipconfig | findstr IPv4`.

**Native PowerShell alternative (no WSL):** Docker Desktop works in PowerShell too. Same commands, but use `Copy-Item .env.example .env` instead of `cp`.

**Line-ending gotcha:** if git is configured with `autocrlf=true`, the `Dockerfile` `CMD` shell script can break. Either set the repo to LF or run `git config --global core.autocrlf input` before cloning.

### Stop / reset

```bash
docker compose down            # stop
docker compose down -v         # stop + delete Ollama model cache (will re-pull)
rm -rf data/                   # wipe your SQLite + uploaded photos
```

## iOS Shortcut recipe (optional)

Create a new Shortcut:

1. **Get Active Energy** for "today"
2. **Get Contents of URL** → `http://<host>:3000/api/activity`
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

## Development (no Docker)

Requires **Node.js 22.12+** (Prisma 7 constraint).

```bash
git clone https://github.com/Chenophobia/HealthMe.git
cd HealthMe
cp .env.example .env
# macOS / Linux: DATABASE_URL already points at ./data/db/healthme.db
# Windows: escape backslashes or use a POSIX path, e.g. file:./data/db/healthme.db
npm install
npx prisma migrate dev
npm run dev
```

Dev server at `http://localhost:3000`. Ollama must be reachable at `OLLAMA_URL` if you want OCR.

Tests: `npm test` (Vitest, 36 unit + integration tests).

## Key paths

| Path | Purpose |
|---|---|
| `src/app/` | Next.js App Router pages |
| `src/app/api/` | API routes |
| `src/components/` | Ink-brush UI primitives |
| `src/lib/` | Pure domain logic (regression, OCR client, date utils) |
| `prisma/schema.prisma` | Data model |
| `prisma.config.ts` | Prisma 7 datasource + migrations config |
| `docs/superpowers/specs/` | Design spec |
| `docs/superpowers/plans/` | Implementation plan |
| `CLAUDE.md` | Agent context for future sessions |
| `data/` | Runtime volume (git-ignored) — SQLite, photos |

## Troubleshooting

- **OCR always fails** → `docker compose logs ollama`. Common cause: model not pulled. Run `docker compose exec ollama ollama pull qwen2.5vl:7b` and wait for completion.
- **`PrismaClient needs adapter`** → you're on Prisma 7. `src/lib/prisma.ts` already uses `PrismaBetterSqlite3`; make sure `@prisma/adapter-better-sqlite3` and `better-sqlite3` are installed.
- **`Cannot open database because the directory does not exist`** during `next build` → add `export const dynamic = "force-dynamic";` to any new page that queries Prisma at render time.
- **Phone can't reach it** → verify both devices are on the same Wi-Fi, that your firewall allows inbound :3000, and that you're using the host's LAN IP (not `localhost`).
- **Port 3000 already in use** → edit `docker-compose.yml` `ports` from `"3000:3000"` to `"3030:3000"` (or any free port).

## Non-goals

- Multi-user or authentication
- Public internet exposure
- Water / steps / workout tracking
- Ingredient-level recipe decomposition
- Nutrition database (all recipe macros entered manually)

## License

MIT
