/**
 * SQLite Management Code Generator
 *
 * Transforms semantic AST nodes into standard SQLite DDL/management SQL.
 * Always generates English SQL keywords regardless of input language.
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// Schema Operations
// =============================================================================

function generateCreateTable(node: SemanticNode): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  const columns = extractRoleValue(node, 'columns') || 'id INTEGER PRIMARY KEY';
  return `CREATE TABLE ${table} (${columns})`;
}

function generateDropTable(node: SemanticNode): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  return `DROP TABLE IF EXISTS ${table}`;
}

function generateAddColumn(node: SemanticNode): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  const column = extractRoleValue(node, 'column') || 'new_column TEXT';
  return `ALTER TABLE ${table} ADD COLUMN ${column}`;
}

function generateRenameTable(node: SemanticNode): string {
  const table = extractRoleValue(node, 'table') || 'old_table';
  const newName = extractRoleValue(node, 'new-name') || 'new_table';
  return `ALTER TABLE ${table} RENAME TO ${newName}`;
}

// =============================================================================
// Index Operations
// =============================================================================

function generateCreateIndex(node: SemanticNode): string {
  const table = extractRoleValue(node, 'table') || 'my_table';
  const column = extractRoleValue(node, 'column') || 'my_column';
  const indexName = `idx_${table}_${column}`;
  return `CREATE INDEX ${indexName} ON ${table} (${column})`;
}

function generateDropIndex(node: SemanticNode): string {
  const index = extractRoleValue(node, 'index') || 'my_index';
  return `DROP INDEX IF EXISTS ${index}`;
}

// =============================================================================
// View Operations
// =============================================================================

function generateCreateView(node: SemanticNode): string {
  const view = extractRoleValue(node, 'view') || 'my_view';
  const query = extractRoleValue(node, 'query') || 'SELECT * FROM my_table';
  return `CREATE VIEW ${view} AS ${query}`;
}

function generateDropView(node: SemanticNode): string {
  const view = extractRoleValue(node, 'view') || 'my_view';
  return `DROP VIEW IF EXISTS ${view}`;
}

// =============================================================================
// Pragma Operations
// =============================================================================

function generatePragmaGet(node: SemanticNode): string {
  const pragma = extractRoleValue(node, 'pragma') || 'journal_mode';
  const target = extractRoleValue(node, 'target');
  if (target) {
    return `PRAGMA ${pragma}(${target})`;
  }
  return `PRAGMA ${pragma}`;
}

function generatePragmaSet(node: SemanticNode): string {
  const pragma = extractRoleValue(node, 'pragma') || 'journal_mode';
  const value = extractRoleValue(node, 'value') || 'wal';
  return `PRAGMA ${pragma} = ${value}`;
}

// =============================================================================
// Admin Operations
// =============================================================================

function generateVacuum(node: SemanticNode): string {
  const target = extractRoleValue(node, 'target');
  if (target) {
    return `VACUUM ${target}`;
  }
  return 'VACUUM';
}

function generateAnalyze(node: SemanticNode): string {
  const target = extractRoleValue(node, 'target');
  if (target) {
    return `ANALYZE ${target}`;
  }
  return 'ANALYZE';
}

function generateAttach(node: SemanticNode): string {
  const path = extractRoleValue(node, 'path') || 'database.db';
  const alias = extractRoleValue(node, 'alias') || 'attached_db';
  return `ATTACH DATABASE '${path}' AS ${alias}`;
}

function generateDetach(node: SemanticNode): string {
  const alias = extractRoleValue(node, 'alias') || 'attached_db';
  return `DETACH DATABASE ${alias}`;
}

// =============================================================================
// Transaction Operations
// =============================================================================

function generateBegin(node: SemanticNode): string {
  const mode = extractRoleValue(node, 'mode');
  if (mode) {
    return `BEGIN ${mode.toUpperCase()} TRANSACTION`;
  }
  return 'BEGIN TRANSACTION';
}

function generateCommit(_node: SemanticNode): string {
  return 'COMMIT';
}

function generateRollback(node: SemanticNode): string {
  const savepoint = extractRoleValue(node, 'savepoint');
  if (savepoint) {
    return `ROLLBACK TO SAVEPOINT ${savepoint}`;
  }
  return 'ROLLBACK';
}

// =============================================================================
// Public API
// =============================================================================

export const sqliteMgmtCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      // Schema
      case 'create-table':
        return generateCreateTable(node);
      case 'drop-table':
        return generateDropTable(node);
      case 'add-column':
        return generateAddColumn(node);
      case 'rename-table':
        return generateRenameTable(node);
      // Index
      case 'create-index':
        return generateCreateIndex(node);
      case 'drop-index':
        return generateDropIndex(node);
      // View
      case 'create-view':
        return generateCreateView(node);
      case 'drop-view':
        return generateDropView(node);
      // Pragma
      case 'pragma-get':
        return generatePragmaGet(node);
      case 'pragma-set':
        return generatePragmaSet(node);
      // Admin
      case 'vacuum':
        return generateVacuum(node);
      case 'analyze':
        return generateAnalyze(node);
      case 'attach':
        return generateAttach(node);
      case 'detach':
        return generateDetach(node);
      // Transaction
      case 'begin':
        return generateBegin(node);
      case 'commit':
        return generateCommit(node);
      case 'rollback':
        return generateRollback(node);
      default:
        throw new Error(`Unknown SQLite management command: ${node.action}`);
    }
  },
};
