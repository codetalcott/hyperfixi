/**
 * All SQLite Management Command Schemas
 *
 * 15 commands across 6 categories:
 * - Schema: create-table, drop-table, add-column, rename-table
 * - Index: create-index, drop-index
 * - View: create-view, drop-view
 * - Pragma: pragma-get, pragma-set
 * - Admin: vacuum, analyze, attach, detach
 * - Transaction: begin, commit, rollback
 */

export { createTableSchema, dropTableSchema, addColumnSchema, renameTableSchema } from './schema-ops';
export { createIndexSchema, dropIndexSchema } from './index-ops';
export { createViewSchema, dropViewSchema } from './view-ops';
export { pragmaGetSchema, pragmaSetSchema } from './pragma-ops';
export { vacuumSchema, analyzeSchema, attachSchema, detachSchema } from './admin-ops';
export { beginSchema, commitSchema, rollbackSchema } from './transaction-ops';

import { createTableSchema, dropTableSchema, addColumnSchema, renameTableSchema } from './schema-ops';
import { createIndexSchema, dropIndexSchema } from './index-ops';
import { createViewSchema, dropViewSchema } from './view-ops';
import { pragmaGetSchema, pragmaSetSchema } from './pragma-ops';
import { vacuumSchema, analyzeSchema, attachSchema, detachSchema } from './admin-ops';
import { beginSchema, commitSchema, rollbackSchema } from './transaction-ops';

export const allSchemas = [
  // Schema
  createTableSchema,
  dropTableSchema,
  addColumnSchema,
  renameTableSchema,
  // Index
  createIndexSchema,
  dropIndexSchema,
  // View
  createViewSchema,
  dropViewSchema,
  // Pragma
  pragmaGetSchema,
  pragmaSetSchema,
  // Admin
  vacuumSchema,
  analyzeSchema,
  attachSchema,
  detachSchema,
  // Transaction
  beginSchema,
  commitSchema,
  rollbackSchema,
];
