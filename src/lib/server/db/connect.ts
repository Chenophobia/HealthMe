import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = './drizzle';

export function connect(file: string): Db {
  const sqlite = new Database(file);
  // Rollback journal, NOT WAL. In production app.db lives on a Docker Desktop
  // bind mount (virtiofs), where SQLite's WAL shared-memory index (-shm) does
  // not work across processes — see learn-japanese's connect.ts for the full
  // war story (observed live: the app held `app.db-wal (deleted)`).
  // DELETE mode uses only POSIX fcntl locks, which virtiofs implements.
  sqlite.pragma('journal_mode = DELETE');
  sqlite.pragma('synchronous = FULL');
  // Wait rather than fail instantly if an operator script overlaps the app.
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
