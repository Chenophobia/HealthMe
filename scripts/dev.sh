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
