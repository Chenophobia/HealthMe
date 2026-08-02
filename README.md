# health-me

## What this is

A personal, single-user health tracker for a fat-loss program — logging
meals, weigh-ins, and workouts against a plan, with a dashboard summarizing
progress over time. The program itself (targets, recipes, training split)
lives at [`docs/fat-loss-program.md`](docs/fat-loss-program.md); the app is
just the day-to-day logging and progress tool built around it.

## Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev/docs/svelte), TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/)
- [@node-rs/argon2](https://github.com/napi-rs/node-rs) for password hashing, session ids as server-looked-up CSPRNG tokens
- Docker for deployment

## Develop

```bash
npm install
cp .env.example .env
npm run dev          # start the dev server
```

There is no signup page — create an account with the operator script (env
vars, so the password doesn't land in shell history):

```bash
CREATE_USER_USERNAME=someone CREATE_USER_PASSWORD='a-strong-password' npm run create-user
```

```bash
npm test             # run the test suite (vitest)
npm run lint         # prettier --check + eslint (what CI runs)
npm run check        # svelte-check (typechecking)
```

## Environment variables

Set these in a `.env` file (copy `.env.example` to start):

| Variable   | Purpose                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `DATA_DIR` | Directory holding `app.db`. In Docker this is `/app/data`, bind-mounted from `./data` on the host.                 |
| `TZ`       | Timezone used to determine "today" when logging meals/weigh-ins/workouts. Without it the container's clock is UTC. |

## Docker

Two ways to run the container, sharing the same `./data` bind mount and
`.env` file so switching between them never touches state:

- **Root `docker-compose.yml`** — builds the image from source (`build: .`).
  The everyday local/dev path:

  ```bash
  mkdir -p data
  cp .env.example .env
  docker compose up -d --build
  docker compose logs -f app
  ```

- **`deploy/compose.yml`** — pulls the image CI publishes to GHCR instead of
  building locally. See "Deployment" below.

Both publish the app on `127.0.0.1:3002` — bound to localhost only.

Day-to-day commands (either compose file):

```bash
docker compose logs -f app     # tail app logs
docker compose restart app     # restart without rebuilding
docker compose down            # stop (data stays in ./data)
docker compose up -d           # start again without rebuilding
```

Operator scripts run against the deployed database via `docker compose run
--rm`, which starts a throwaway container sharing the `./data` bind mount.
**Stop the main app first** so exactly one process ever touches `app.db`:

```bash
docker compose stop
docker compose run --rm \
  -e CREATE_USER_USERNAME=someone -e CREATE_USER_PASSWORD='a-strong-password' \
  app npm run create-user
docker compose start
```

Resetting a password (no self-service reset exists):

```bash
docker compose stop
docker compose run --rm \
  -e SET_PASSWORD_USERNAME=someone -e SET_PASSWORD_PASSWORD='a-strong-password' \
  app npm run set-password
docker compose start
```

Rebuilding recipes/exercises reference data (destructive to nothing user-logged,
but refuses if any meal/workout log already references the old rows):

```bash
docker compose stop
docker compose run --rm -e RESEED_CONFIRM=yes app npm run reseed
docker compose start
```

## Deployment

CI builds and pushes `ghcr.io/chenophobia/health-me:latest` on every green
`main` build (see `.github/workflows/ci.yml`). The deployment host doesn't
need an inbound webhook or a self-hosted runner for this — instead a launchd
agent polls: every 5 minutes it runs `deploy/update.sh`, which pulls the
image and restarts the container only when a newer one was actually
published.

The pieces, all under `deploy/`:

- `compose.yml` — same container, ports, `.env`, and `../data` bind mount as
  the root compose file, but `image:` from GHCR instead of `build: .`.
- `update.sh` — pull + `up -d` + prune, logging only actual deploys (and
  failures) to `deploy/update.log`.
- `com.chenophobia.health-me.update.plist` — the launchd agent definition.
  It's a template: launchd won't expand `~`, so `__REPO__` is substituted
  with the checkout's real path at install time.

One-time cutover from a locally-built container, run from the repo root:

```bash
docker compose down                        # stop the locally-built container (data survives in ./data)
docker compose -f deploy/compose.yml up -d # start from the GHCR image
sed "s|__REPO__|$PWD|g" deploy/com.chenophobia.health-me.update.plist > ~/Library/LaunchAgents/com.chenophobia.health-me.update.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.chenophobia.health-me.update.plist
```

Uninstall: `launchctl bootout gui/$(id -u)/com.chenophobia.health-me.update`.

This requires the `health-me` GHCR package to be pullable from the host:
either set it to **public** on GitHub (Packages → package settings → Change
visibility) after the first CI push, or `docker login ghcr.io` on the host
with a read-only `read:packages` token.

The real request path to the deployed app, once it's live:

```
Browser → Cloudflare edge (TLS) → Cloudflare Tunnel → cloudflared (host)
        → 127.0.0.1:8090 (Homebrew nginx) → 127.0.0.1:3002 (Docker app)
```

TLS is terminated by Cloudflare at the edge; everything downstream (the
tunnel hop and the proxy hop into nginx) is plain HTTP over localhost, which
is fine because none of it leaves the machine. The container port is bound
to `127.0.0.1` only — never exposed publicly. Real tunnel ids, credential
paths, and hostnames are deliberately not reproduced here, since this repo
may be public; those values live only on the host.

Go-live checklist (host-side, not run from this repo):

- [ ] Add a Homebrew nginx server block listening on `127.0.0.1:8090` that
      proxies to `127.0.0.1:3002`, then `nginx -t && nginx -s reload`.
- [ ] Add an ingress rule for the app's hostname to the host's
      `cloudflared` config, pointing at `http://localhost:8090`, **above**
      the catch-all 404 rule (ingress rules match top-to-bottom).
- [ ] Create the DNS route for the app's hostname via
      `cloudflared tunnel route dns <tunnel-id> <app-hostname>`.
- [ ] Restart the tunnel so it picks up the new config — this briefly
      interrupts every other hostname sharing the same `cloudflared`
      process.
- [ ] Verify: load the hostname over HTTPS, confirm it redirects to
      `/login`, sign in with an account created via `create-user`, and log
      something to confirm it persists across a reload.
