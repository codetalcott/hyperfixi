/**
 * SQLite Database Layer
 *
 * Stores field-level edits as an overlay on top of base profiles.
 * Uses Bun's native SQLite for zero-dependency persistence.
 */

import { Database } from 'bun:sqlite';
import { resolve } from 'path';

const DB_PATH = resolve(import.meta.dir, '../data/profiles.db');

const db = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent read/write
db.exec('PRAGMA journal_mode = WAL');

// =============================================================================
// Schema
// =============================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS edits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    language   TEXT NOT NULL,
    section    TEXT NOT NULL,
    field_path TEXT NOT NULL,
    old_value  TEXT,
    new_value  TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(language, section, field_path)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT NOT NULL,
    language   TEXT NOT NULL,
    section    TEXT,
    field_path TEXT,
    detail     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_edits_language ON edits(language);
  CREATE INDEX IF NOT EXISTS idx_edits_status ON edits(language, section);
  CREATE INDEX IF NOT EXISTS idx_audit_language ON audit_log(language);
`);

// =============================================================================
// Types
// =============================================================================

export interface Edit {
  id: number;
  language: string;
  section: string;
  field_path: string;
  old_value: string | null;
  new_value: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  language: string;
  section: string | null;
  field_path: string | null;
  detail: string | null;
  created_at: string;
}

// =============================================================================
// Prepared Statements
// =============================================================================

const stmts = {
  upsertEdit: db.prepare<
    void,
    [string, string, string, string | null, string]
  >(`
    INSERT INTO edits (language, section, field_path, old_value, new_value)
    VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(language, section, field_path) DO UPDATE SET
      new_value = excluded.new_value,
      created_at = datetime('now')
  `),

  getEditsForLanguage: db.prepare<Edit, [string]>(
    'SELECT * FROM edits WHERE language = ?1 ORDER BY section, field_path'
  ),

  getEditsForSection: db.prepare<Edit, [string, string]>(
    'SELECT * FROM edits WHERE language = ?1 AND section = ?2 ORDER BY field_path'
  ),

  getEditCountByLanguage: db.prepare<{ language: string; count: number }, []>(
    'SELECT language, COUNT(*) as count FROM edits GROUP BY language'
  ),

  getTotalEditCount: db.prepare<{ count: number }, []>(
    'SELECT COUNT(*) as count FROM edits'
  ),

  deleteEdit: db.prepare<void, [string, string, string]>(
    'DELETE FROM edits WHERE language = ?1 AND section = ?2 AND field_path = ?3'
  ),

  deleteEditsForLanguage: db.prepare<void, [string]>(
    'DELETE FROM edits WHERE language = ?1'
  ),

  insertAudit: db.prepare<void, [string, string, string | null, string | null, string | null]>(
    'INSERT INTO audit_log (action, language, section, field_path, detail) VALUES (?1, ?2, ?3, ?4, ?5)'
  ),

  getAuditLog: db.prepare<AuditEntry, []>(
    'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200'
  ),

  getAuditLogForLanguage: db.prepare<AuditEntry, [string]>(
    'SELECT * FROM audit_log WHERE language = ?1 ORDER BY created_at DESC LIMIT 200'
  ),
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Save or update an edit for a specific field.
 */
export function saveEdit(
  language: string,
  section: string,
  fieldPath: string,
  oldValue: string | null,
  newValue: string
): void {
  stmts.upsertEdit.run(language, section, fieldPath, oldValue, newValue);
  stmts.insertAudit.run('edit', language, section, fieldPath,
    JSON.stringify({ old: oldValue, new: newValue }));
}

/**
 * Get all pending edits for a language.
 */
export function getEditsForLanguage(language: string): Edit[] {
  return stmts.getEditsForLanguage.all(language);
}

/**
 * Get edits for a specific section of a language.
 */
export function getEditsForSection(language: string, section: string): Edit[] {
  return stmts.getEditsForSection.all(language, section);
}

/**
 * Get edit counts grouped by language.
 */
export function getEditCounts(): Record<string, number> {
  const rows = stmts.getEditCountByLanguage.all();
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.language] = row.count;
  }
  return result;
}

/**
 * Get total number of pending edits.
 */
export function getTotalEditCount(): number {
  return stmts.getTotalEditCount.get()?.count ?? 0;
}

/**
 * Delete a specific edit.
 */
export function deleteEdit(language: string, section: string, fieldPath: string): void {
  stmts.deleteEdit.run(language, section, fieldPath);
  stmts.insertAudit.run('revert', language, section, fieldPath, null);
}

/**
 * Revert all edits for a language.
 */
export function revertLanguage(language: string): number {
  const edits = stmts.getEditsForLanguage.all(language);
  stmts.deleteEditsForLanguage.run(language);
  stmts.insertAudit.run('revert', language, null, null,
    JSON.stringify({ count: edits.length }));
  return edits.length;
}

/**
 * Get audit log entries.
 */
export function getAuditLog(language?: string): AuditEntry[] {
  if (language) {
    return stmts.getAuditLogForLanguage.all(language);
  }
  return stmts.getAuditLog.all();
}

/**
 * Log an export action.
 */
export function logExport(language: string, detail: string): void {
  stmts.insertAudit.run('export', language, null, null, detail);
}

export default db;
