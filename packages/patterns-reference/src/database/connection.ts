/**
 * Database Connection Management
 *
 * Provides singleton connection to the patterns-reference SQLite database.
 */

import Database from 'better-sqlite3';
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
