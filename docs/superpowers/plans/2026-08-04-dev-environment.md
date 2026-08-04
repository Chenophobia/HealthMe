# Dev Environment + Branch Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the repo a dev server that runs against an isolated snapshot of prod data, and a documented branch-per-feature squash-merge workflow.

**Architecture:** A bash wrapper (`scripts/dev.sh`) snapshots the live prod SQLite DB into a gitignored `./data-dev/` (via `sqlite3 .backup`, safe on a live DB) and starts vite with `DATA_DIR=./data-dev`. `CLAUDE.md` documents the dev-vs-prod workflow rules. No app code, CI, or deploy changes.

**Tech Stack:** bash, sqlite3 CLI (ships with macOS), npm scripts, SvelteKit/vite dev server.

## Global Constraints

- Dev must never open `./data/app.db` (live prod database).
- Dev DB lives in `./data-dev/` and is gitignored.
- Dev URL is http://localhost:5173.
- No changes to Docker, CI workflows, or `deploy/`.
- Spec: `docs/superpowers/specs/2026-08-04-dev-environment-design.md`.

---

### Task 1: dev.sh wrapper + npm scripts + gitignore

**Files:**
- Create: `scripts/dev.sh`
- Modify: `package.json` (scripts block, lines 9–24)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run dev` (snapshot-if-missing, then vite dev on 5173 with `DATA_DIR=./data-dev`), `npm run dev:fresh-data` (force re-snapshot, no server start).

- [ ] **Step 1: Write `scripts/dev.sh`**

```bash
#!/usr/bin/env bash
# Dev server against an isolated snapshot of prod data.
#
# Prod's live database is ./data/app.db (bind-mounted into the container);
# the app's DATA_DIR default is ./data, so a bare `vite dev` would open the
# real thing. This wrapper keeps dev on ./data-dev/app.db instead:
#
#   scripts/dev.sh            snapshot prod -> data-dev if missing, run vite
#   scripts/dev.sh --fresh    re-snapshot prod -> data-dev, then exit
#
# Snapshots use sqlite3's .backup, which is safe against a database that is
# mid-write (a plain cp is not).
set -euo pipefail
cd "$(dirname "$0")/.."

PROD_DB=./data/app.db
DEV_DIR=./data-dev
DEV_DB=$DEV_DIR/app.db

snapshot() {
  mkdir -p "$DEV_DIR"
  sqlite3 "$PROD_DB" ".backup '$DEV_DB'"
  echo "Snapshotted $PROD_DB -> $DEV_DB"
}

if [ "${1:-}" = "--fresh" ]; then
  snapshot
  exit 0
fi

[ -f "$DEV_DB" ] || snapshot
DATA_DIR=$DEV_DIR exec npx vite dev
```

- [ ] **Step 2: Make it executable and wire up npm scripts**

Run: `chmod +x scripts/dev.sh`

In `package.json`, change the `dev` script and add `dev:fresh-data` directly below it:

```json
    "dev": "scripts/dev.sh",
    "dev:fresh-data": "scripts/dev.sh --fresh",
```

- [ ] **Step 3: Gitignore the dev data directory**

In `.gitignore`, add `/data-dev` on the line after `/data`:

```
/data
/data-dev
```

- [ ] **Step 4: Test the snapshot path**

Run: `npm run dev:fresh-data && ls -la data-dev/ && sqlite3 data-dev/app.db "select count(*) from users;"`
Expected: "Snapshotted ./data/app.db -> ./data-dev/app.db", `app.db` listed, and a non-zero user count.

- [ ] **Step 5: Test the dev server uses the snapshot, not prod**

Record prod DB mtime: `stat -f %m data/app.db`
Run: `npm run dev` (in background), wait for startup, then `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/login`
Expected: `200`. Then stop the server and re-run `stat -f %m data/app.db` — mtime unchanged. Also `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/login` still returns `200` (prod container untouched).

- [ ] **Step 6: Commit**

```bash
git add scripts/dev.sh package.json .gitignore
git commit -m "feat: dev server runs against a snapshot of prod data"
```

### Task 2: CLAUDE.md workflow file

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: `npm run dev` / `npm run dev:fresh-data` from Task 1.
- Produces: workflow rules Claude follows in every future session.

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# CLAUDE.md

## ⚠️ Prod runs from this checkout

Prod is a Docker container on this same Mac (http://127.0.0.1:3002), and
**`./data/app.db` is the live prod database**. Never point a dev server,
script, or one-off query at `./data` — dev works against the gitignored
snapshot in `./data-dev` only.

Deploys are automatic: every push to `main` triggers CI to build the image,
and a launchd agent on this Mac pulls it within ~5 minutes. **Pushing to
main IS deploying to prod.**

## Workflow: always ask dev or prod first

At the start of any change request, ask the user: **work on dev, or push
straight to prod?** Don't assume either way.

### Dev (the default for features)

1. Create a feature branch off `main` (e.g. `feat/<short-name>`).
2. Start the dev server with `npm run dev` and give the user the URL:
   **http://localhost:5173**. It serves `./data-dev/app.db` — on first run
   this is auto-snapshotted from prod; `npm run dev:fresh-data` re-copies
   current prod data on demand.
3. Iterate on the branch with the user testing on localhost.

### Finishing a feature (squash-merge to main)

When the user says the feature is done:

1. Verify: `npm run lint && npm run check && npm test`
2. Squash-merge locally and push:

   ```bash
   git checkout main
   git merge --squash feat/<short-name>
   git commit   # one commit message for the whole feature
   git push
   git branch -D feat/<short-name>
   ```

3. Remind the user prod goes live in ~5 minutes.

### Straight to prod

Only when the user explicitly chooses it (trivial/urgent changes): commit on
`main`, run the same verify commands, push.

## Commands

- `npm run dev` — dev server on http://localhost:5173 (isolated dev DB)
- `npm run dev:fresh-data` — re-snapshot prod → dev DB
- `npm run lint` / `npm run check` / `npm test` — what CI runs
- More project details: `README.md`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md with dev/prod workflow rules"
```

### Task 3: End-to-end verification (spec's Verification section)

**Files:** none (verification only)

- [ ] **Step 1: Full pass**

With the dev server running via `npm run dev`:
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/login` → `200`
- `stat -f %m data/app.db` unchanged since before dev started
- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/login` → `200`
- `git status` clean except intended files; `data-dev/` absent from `git status` output.

- [ ] **Step 2: Existing checks still pass**

Run: `npm run lint && npm run check && npm test`
Expected: all pass (scripts/dev.sh and CLAUDE.md shouldn't affect them, prettier may want to format CLAUDE.md — if so, run `npm run format` and amend).
