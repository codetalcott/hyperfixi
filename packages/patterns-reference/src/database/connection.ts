/**
 * Database Connection Management
 *
 * Provides singleton connection to the hyperscript-lsp SQLite database.
 */

import Database from 'better-sqlite3';
import type { ConnectionOptions } from '../types';

// Default path relative to package root
const DEFAULT_DB_PATH =
  process.env.LSP_DB_PATH ||
  process.env.HYPERSCRIPT_LSP_DB ||
  '../../../hyperscript-lsp/data/hyperscript.db';

let dbInstance: InstanceType<typeof Database> | null = null;
let currentDbPath: string | null = null;

/**
 * Get database connection (lazy singleton).
 */
export function getDatabase(options: ConnectionOptions = {}): InstanceType<typeof Database> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;

  // Return existing connection if same path
  if (dbInstance !== null && currentDbPath === dbPath) {
    return dbInstance;
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
  }
}

/**
 * For testing: reset the database connection.
 */
export function resetConnection(): void {
  dbInstance = null;
  currentDbPath = null;
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
