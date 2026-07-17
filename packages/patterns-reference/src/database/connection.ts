/**
 * Database Connection Management
 *
 * Provides singleton connection to the patterns-reference SQLite database.
 */

import Database from 'better-sqlite3';
import { statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ConnectionOptions } from '../types';

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default path resolved from the dist directory after bundling
// When bundled by tsup, __dirname will be the dist/ folder
// So we need to go up one level to reach the package root, then into data/
const DEFAULT_DB_PATH =
  process.env.LSP_DB_PATH ||
  process.env.HYPERSCRIPT_LSP_DB ||
  join(__dirname, '../data/patterns.db');

let dbInstance: InstanceType<typeof Database> | null = null;
let currentDbPath: string | null = null;

/**
 * Identity of the FILE the open handle is reading, captured when it was opened.
 *
 * `npm run populate` REPLACES patterns.db rather than mutating it, so a long-lived handle
 * (the MCP server's, most notably) keeps reading the old inode: every query answers from
 * the pre-populate database while the file on disk says otherwise. Path equality cannot
 * see this — the path is identical; only the inode moved.
 */
let openFileId: string | null = null;
let lastIdentityCheckAt = 0;

/** Re-stat at most this often, so a bulk query loop pays one syscall, not thousands. */
const IDENTITY_TTL_MS = 1000;

/** inode+device+size+mtime — changes iff the file was replaced or rewritten. */
function fileIdentity(path: string): string | null {
  try {
    const s = statSync(path);
    return `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}`;
  } catch {
    return null; // mid-replace: treat as unknown, don't thrash the handle
  }
}

/**
 * The resolved default DB path (honouring `LSP_DB_PATH` / `HYPERSCRIPT_LSP_DB`).
 * Exposed so callers (e.g. the multilingual gate's freshness check) can target the
 * exact DB that `getDatabase()` opens.
 */
export function getDefaultDbPath(): string {
  return DEFAULT_DB_PATH;
}

/**
 * Get database connection (lazy singleton).
 */
export function getDatabase(options: ConnectionOptions = {}): InstanceType<typeof Database> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;

  // Reuse the open handle only if it is reading the same PATH *and* the same FILE. The
  // second half matters because `populate` swaps the file underneath us: without it a
  // long-lived consumer serves pre-populate rows indefinitely, which looks like a parser
  // bug and is not one. Behind a TTL so a query loop doesn't stat per row.
  if (dbInstance !== null && currentDbPath === dbPath) {
    const now = Date.now();
    if (now - lastIdentityCheckAt < IDENTITY_TTL_MS) {
      return dbInstance;
    }
    lastIdentityCheckAt = now;
    const identity = fileIdentity(dbPath);
    if (identity === null || identity === openFileId) {
      return dbInstance;
    }
    // The file was replaced — reopen so callers see the DB that is actually on disk.
    dbInstance.close();
    dbInstance = null;
  }

  // Close existing connection if path changed
  if (dbInstance !== null) {
    dbInstance.close();
  }

  dbInstance = new Database(dbPath, {
    readonly: options.readonly ?? false,
  });

  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');

  currentDbPath = dbPath;
  openFileId = fileIdentity(dbPath);
  lastIdentityCheckAt = Date.now();
  return dbInstance;
}

/**
 * Close database connection.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    currentDbPath = null;
    openFileId = null;
    lastIdentityCheckAt = 0;
  }
}

/**
 * For testing: reset the database connection.
 */
export function resetConnection(): void {
  dbInstance = null;
  currentDbPath = null;
  openFileId = null;
  lastIdentityCheckAt = 0;
}

/**
 * Check if database is connected.
 */
export function isConnected(): boolean {
  return dbInstance !== null;
}

/**
 * Get the current database path.
 */
export function getCurrentDbPath(): string | null {
  return currentDbPath;
}
