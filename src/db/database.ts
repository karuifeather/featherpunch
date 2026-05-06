import * as SQLite from "expo-sqlite";

const DB_NAME = "featherpunch.db";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync("PRAGMA journal_mode = WAL;");
  await _db.execAsync("PRAGMA foreign_keys = ON;");
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      tag TEXT NOT NULL CHECK(tag IN ('me', 'other')),
      hourly_rate REAL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      start_at TEXT NOT NULL,
      end_at TEXT,
      duration_ms INTEGER,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'import', 'edited')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_role_id ON sessions(role_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_end_at ON sessions(end_at);
    CREATE INDEX IF NOT EXISTS idx_roles_is_archived ON roles(is_archived);
  `);
  await ensureSessionSnapshotColumns(db);
}

async function ensureSessionSnapshotColumns(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(sessions)",
  );
  const columnNames = new Set(columns.map((column) => column.name));
  if (!columnNames.has("hourly_rate_snapshot")) {
    await db.execAsync(
      "ALTER TABLE sessions ADD COLUMN hourly_rate_snapshot REAL",
    );
  }
  if (!columnNames.has("estimated_earnings_snapshot")) {
    await db.execAsync(
      "ALTER TABLE sessions ADD COLUMN estimated_earnings_snapshot REAL",
    );
  }
}

export async function closeDb() {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}
