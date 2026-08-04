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
   **http://localhost:5173**. It serves `./data-dev/app.db` — on first run
   this is auto-snapshotted from prod; `npm run dev:fresh-data` re-copies
   current prod data on demand (restart the dev server afterwards — it
   still holds the old file open).
3. Iterate on the branch with the user testing on localhost.

### Finishing a feature (squash-merge to main)

When the user says the feature is done:

1. Verify: `npm run lint && npm run check && npm test && npm run build`
   (all four are what CI runs — a red CI means no image and no deploy)
2. Squash-merge locally and push:

   ```bash
   git checkout main
   git merge --squash feat/<short-name>
   git commit   # one commit message for the whole feature
   git push
   git branch -D feat/<short-name>
   git push origin --delete feat/<short-name>   # if the branch was pushed
   ```

3. Remind the user prod goes live in ~5–10 minutes (watch for the
   `deployed` line in `deploy/update.log`).

### Straight to prod

Only when the user explicitly chooses it (trivial/urgent changes): commit on
`main`, run the same verify commands, push.

## Commands

- `npm run dev` — dev server on http://localhost:5173 (isolated dev DB)
- `npm run dev:fresh-data` — re-snapshot prod → dev DB
- `npm run lint` / `npm run check` / `npm test` — what CI runs
- More project details: `README.md`
