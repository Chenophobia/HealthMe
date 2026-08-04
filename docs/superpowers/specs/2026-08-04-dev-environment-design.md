# Dev environment + branch workflow — design

**Date:** 2026-08-04
**Status:** approved

## Problem

The repo checkout doubles as the prod host: prod runs as a Docker container on
this Mac (`127.0.0.1:3002`), and `./data/app.db` is the live prod database.
`npm run dev` resolves `DATA_DIR ?? './data'`, so the dev server would read and
write real prod data. There is also no documented workflow, so every change is
pushed straight to main and deployed.

## Design

### 1. Dev data isolation

- A gitignored `./data-dev/` directory holds the dev database.
- `npm run dev` runs a wrapper script (`scripts/dev.sh`) that:
  1. If `data-dev/app.db` does not exist, snapshots the prod DB with
     `sqlite3 ./data/app.db ".backup ./data-dev/app.db"` — safe against a
     live, mid-write database, unlike `cp`.
  2. Starts vite with `DATA_DIR=./data-dev` exported explicitly.
- `npm run dev:fresh-data` re-snapshots prod over the dev DB on demand.
- Dev URL: **http://localhost:5173**. Dev never opens `./data/app.db`.

### 2. Workflow rules (new `CLAUDE.md` at repo root)

- At the start of any change request, Claude asks: **dev or straight to prod?**
- **Dev:** create a feature branch off main, start the dev server, hand the
  user http://localhost:5173.
- **Prod:** commit on main and push — reserved for trivial/urgent changes,
  the user decides per-task.
- **Finishing a feature:** run `npm run lint && npm run check && npm test`,
  then local squash-merge into main, push, delete the branch. Prod goes live
  automatically ~5 minutes after push (CI builds the image, launchd pulls it).
- Loud warning: `./data` is the live prod database; dev must never point at it.

### 3. Out of scope

No new Docker services; no changes to CI, deploy scripts, or the app itself.

## Verification

Start the dev server; confirm it serves on 5173 against `data-dev/app.db`;
confirm prod's DB file mtime is unchanged and the prod container still
responds on 3002.
