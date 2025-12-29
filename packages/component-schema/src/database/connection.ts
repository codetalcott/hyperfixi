/**
 * SQLite database connection management
 * Provides a singleton connection pattern for component registry
 */
import Database from 'better-sqlite3';
import * as path from 'path';

export interface ConnectionOptions {
  dbPath?: string;
  readonly?: boolean;
}

// Singleton instance
let db: Database.Database | null = null;
let currentDbPath: string | null = null;

// Default database path
const DEFAULT_DB_PATH = './components.db';

/**
 * Get or create the database connection
 */
export function getDatabase(options: ConnectionOptions = {}): Database.Database {
  const dbPath = options.dbPath || process.env.COMPONENT_SCHEMA_DB || DEFAULT_DB_PATH;

  // If already connected to the same path, return existing connection
  if (db && currentDbPath === dbPath) {
    return db;
  }

  // Close existing connection if switching databases
  if (db) {
    closeDatabase();
  }

  // Create new connection
  db = new Database(dbPath, {
    readonly: options.readonly ?? false,
  });

  currentDbPath = dbPath;

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    currentDbPath = null;
  }
}

/**
 * Reset the connection (useful for testing)
 */
export function resetConnection(): void {
  closeDatabase();
}

/**
 * Check if currently connected
 */
export function isConnected(): boolean {
  return db !== null;
}

/**
 * Get the current database path
 */
export function getCurrentDbPath(): string | null {
  return currentDbPath;
}

/**
 * Get the default database path
 */
export function getDefaultDbPath(): string {
  return DEFAULT_DB_PATH;
}
