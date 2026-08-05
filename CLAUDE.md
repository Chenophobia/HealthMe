# CLAUDE.md

## ⚠️ Prod runs from this checkout

Prod is a Docker container on this same Mac (http://127.0.0.1:3002), and
**`./data/app.db` is the live prod database**. Never point a dev server,
script, or one-off query at `./data` — dev works against the gitignored
snapshot in `./data-dev` only.

Deploys are automatic: every push to `main` triggers CI to build the image
(only if lint/check/test/build all pass), and a launchd agent on this Mac
pulls it within 5 minutes of CI finishing — ~5–10 minutes wall clock.
**Pushing to main IS deploying to prod.** Confirm a deploy actually landed
by the new `deployed` line in `deploy/update.log`.

## Workflow: always ask dev or prod first

At the start of any change request, ask the user: **work on dev, or push
straight to prod?** Don't assume either way.

### Dev (the default for features)

1. Create a feature branch off `main` (e.g. `feat/<short-name>`).
2. Start the dev server with `npm run dev` and give the user the URL:
   **http://localhost:5173** — plus the LAN URL vite prints
   (`http://<mac-ip>:5173`, e.g. from `ipconfig getifaddr en0`) when they
   want to open it on their phone. It serves `./data-dev/app.db` — on first run
   this is auto-snapshotted from prod; `npm run dev:fresh-data` re-copies
   current prod data on demand (restart the dev server afterwards — it
   still holds the old file open).
3. Iterate on the branch with the user testing on localhost.

### Finishing a feature (PR, then squash-merge on GitHub)

Never squash-merge locally — the PR is the record of what was done and why.

When the user says the feature is done:

1. Verify: `npm run lint && npm run check && npm test && npm run build`
   (all four are what CI runs — a red CI means no image and no deploy)
2. Push the branch and open a PR:

   ```bash
   git push -u origin feat/<short-name>
   gh pr create --fill   # title + body summarising the feature
   ```

3. Give the user the PR URL to review. Wait for their approval — they may
   review on GitHub or just say "merge it" in chat.
4. Squash-merge on GitHub, which also deletes the remote branch:

   ```bash
   gh pr merge --squash --delete-branch
   git checkout main && git pull
   git branch -D feat/<short-name>
   ```

5. Remind the user prod goes live in ~5–10 minutes (watch for the
   `deployed` line in `deploy/update.log`).

### Straight to prod

Only when the user explicitly chooses it (trivial/urgent changes): commit on
`main`, run the same verify commands, push.

## Commands

- `npm run dev` — dev server on http://localhost:5173 (isolated dev DB)
- `npm run dev:fresh-data` — re-snapshot prod → dev DB
- `npm run lint` / `npm run check` / `npm test` — what CI runs
- More project details: `README.md`
