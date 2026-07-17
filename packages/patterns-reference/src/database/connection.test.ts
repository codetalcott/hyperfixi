/**
 * Database Connection Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getDatabase,
  closeDatabase,
  resetConnection,
  isConnected,
  getCurrentDbPath,
} from './connection';

// Inline test schema
const TEST_SCHEMA = `
CREATE TABLE IF NOT EXISTS code_examples (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  raw_code TEXT NOT NULL,
  description TEXT,
  feature TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pattern_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT REFERENCES code_examples(id),
  language TEXT NOT NULL,
  hyperscript TEXT NOT NULL,
  word_order TEXT,
  translation_method TEXT DEFAULT 'auto-generated',
  confidence REAL DEFAULT 0.5,
  verified_parses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS llm_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT REFERENCES code_examples(id),
  language TEXT NOT NULL,
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  quality_score REAL DEFAULT 0.8,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

describe('Database Connection', () => {
  beforeEach(() => {
    resetConnection();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('getDatabase', () => {
    it('creates a new connection to in-memory database', () => {
      const db = getDatabase({ dbPath: ':memory:' });
      expect(db).toBeDefined();
      expect(isConnected()).toBe(true);
    });

    it('returns same instance for same path (singleton)', () => {
      const db1 = getDatabase({ dbPath: ':memory:' });
      const db2 = getDatabase({ dbPath: ':memory:' });
      expect(db1).toBe(db2);
    });

    it('can execute SQL on the database', () => {
      const db = getDatabase({ dbPath: ':memory:' });
      db.exec(TEST_SCHEMA);

      // Verify tables exist
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('code_examples');
      expect(tableNames).toContain('pattern_translations');
      expect(tableNames).toContain('llm_examples');
    });
  });

  describe('closeDatabase', () => {
    it('closes the connection', () => {
      getDatabase({ dbPath: ':memory:' });
      expect(isConnected()).toBe(true);

      closeDatabase();
      expect(isConnected()).toBe(false);
    });

    it('is safe to call when no connection exists', () => {
      expect(isConnected()).toBe(false);
      expect(() => closeDatabase()).not.toThrow();
    });
  });

  describe('resetConnection', () => {
    it('resets the connection state', () => {
      getDatabase({ dbPath: ':memory:' });
      expect(getCurrentDbPath()).toBe(':memory:');

      resetConnection();
      expect(getCurrentDbPath()).toBe(null);
    });
  });

  describe('isConnected', () => {
    it('returns false initially', () => {
      expect(isConnected()).toBe(false);
    });

    it('returns true after connection', () => {
      getDatabase({ dbPath: ':memory:' });
      expect(isConnected()).toBe(true);
    });

    it('returns false after close', () => {
      getDatabase({ dbPath: ':memory:' });
      closeDatabase();
      expect(isConnected()).toBe(false);
    });
  });

  describe('getCurrentDbPath', () => {
    it('returns null initially', () => {
      expect(getCurrentDbPath()).toBe(null);
    });

    it('returns the path after connection', () => {
      getDatabase({ dbPath: ':memory:' });
      expect(getCurrentDbPath()).toBe(':memory:');
    });
  });

  // `npm run populate` REPLACES patterns.db rather than mutating it. A long-lived consumer
  // (the MCP server, most notably) kept reading the old inode and answered every query from
  // the pre-populate database — indistinguishable from a parser bug, and silent. Path
  // equality cannot see it: the path is identical, only the file moved.
  describe('file-replacement detection (the populate footgun)', () => {
    let dir: string;
    let dbPath: string;

    const seed = (path: string, id: string): void => {
      const db = new Database(path);
      db.exec('CREATE TABLE t (id TEXT)');
      db.prepare('INSERT INTO t (id) VALUES (?)').run(id);
      db.close();
    };
    const readId = (db: InstanceType<typeof Database>): string =>
      (db.prepare('SELECT id FROM t LIMIT 1').get() as { id: string }).id;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'conn-'));
      dbPath = join(dir, 'patterns.db');
    });
    afterEach(() => {
      closeDatabase();
      rmSync(dir, { recursive: true, force: true });
    });

    it('reopens when the file is replaced under the open handle', async () => {
      seed(dbPath, 'before-populate');
      expect(readId(getDatabase({ dbPath }))).toBe('before-populate');

      // What populate does: write a brand-new file over the same path.
      rmSync(dbPath);
      seed(dbPath, 'after-populate');

      // Past the identity-check TTL, the next getDatabase must notice and reopen.
      await new Promise(r => setTimeout(r, 1100));
      expect(readId(getDatabase({ dbPath }))).toBe('after-populate');
    });

    it('still returns the singleton when the file has not changed', () => {
      seed(dbPath, 'x');
      const a = getDatabase({ dbPath });
      const b = getDatabase({ dbPath });
      expect(b).toBe(a);
    });

    it('does not thrash the handle for :memory: (no file to stat)', () => {
      const a = getDatabase({ dbPath: ':memory:' });
      const b = getDatabase({ dbPath: ':memory:' });
      expect(b).toBe(a);
      expect(isConnected()).toBe(true);
    });
  });
});
