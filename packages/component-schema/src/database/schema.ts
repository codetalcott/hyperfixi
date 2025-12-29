/**
 * SQLite schema for component registry
 */

export const SCHEMA = `
-- Main components table
CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  category TEXT,
  tags TEXT,           -- JSON array
  hyperscript TEXT NOT NULL,  -- JSON (string or array)
  template TEXT,       -- JSON object
  dependencies TEXT,   -- JSON object
  configuration TEXT,  -- JSON object
  metadata TEXT,       -- JSON object
  validation TEXT,     -- JSON object
  testing TEXT,        -- JSON object
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_version ON components(version);
CREATE INDEX IF NOT EXISTS idx_components_created_at ON components(created_at);

-- FTS5 for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS components_fts USING fts5(
  id,
  name,
  description,
  tags,
  keywords,
  hyperscript,
  content='components',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with main table
CREATE TRIGGER IF NOT EXISTS components_ai AFTER INSERT ON components BEGIN
  INSERT INTO components_fts(rowid, id, name, description, tags, keywords, hyperscript)
  VALUES (
    new.rowid,
    new.id,
    new.name,
    new.description,
    new.tags,
    json_extract(new.metadata, '$.keywords'),
    new.hyperscript
  );
END;

CREATE TRIGGER IF NOT EXISTS components_ad AFTER DELETE ON components BEGIN
  INSERT INTO components_fts(components_fts, rowid, id, name, description, tags, keywords, hyperscript)
  VALUES (
    'delete',
    old.rowid,
    old.id,
    old.name,
    old.description,
    old.tags,
    json_extract(old.metadata, '$.keywords'),
    old.hyperscript
  );
END;

CREATE TRIGGER IF NOT EXISTS components_au AFTER UPDATE ON components BEGIN
  INSERT INTO components_fts(components_fts, rowid, id, name, description, tags, keywords, hyperscript)
  VALUES (
    'delete',
    old.rowid,
    old.id,
    old.name,
    old.description,
    old.tags,
    json_extract(old.metadata, '$.keywords'),
    old.hyperscript
  );
  INSERT INTO components_fts(rowid, id, name, description, tags, keywords, hyperscript)
  VALUES (
    new.rowid,
    new.id,
    new.name,
    new.description,
    new.tags,
    json_extract(new.metadata, '$.keywords'),
    new.hyperscript
  );
END;
`;

/**
 * Initialize the database schema
 */
export function initializeSchema(db: import('better-sqlite3').Database): void {
  db.exec(SCHEMA);
}

/**
 * Check if the schema is initialized
 */
export function isSchemaInitialized(db: import('better-sqlite3').Database): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='components'
  `).get();
  return !!result;
}

/**
 * Drop all tables (for testing or reset)
 */
export function dropSchema(db: import('better-sqlite3').Database): void {
  db.exec(`
    DROP TRIGGER IF EXISTS components_au;
    DROP TRIGGER IF EXISTS components_ad;
    DROP TRIGGER IF EXISTS components_ai;
    DROP TABLE IF EXISTS components_fts;
    DROP TABLE IF EXISTS components;
  `);
}
