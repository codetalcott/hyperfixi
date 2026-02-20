/**
 * Schema Operations — CREATE TABLE, DROP TABLE, ALTER TABLE
 *
 * These commands manage SQLite table structure (DDL).
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// CREATE TABLE
// =============================================================================

export const createTableSchema = defineCommand({
  action: 'create-table',
  description: 'Create a new table with column definitions',
  category: 'schema',
  primaryRole: 'table',
  roles: [
    defineRole({
      role: 'table',
      description: 'Name of the table to create',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'columns',
      description: 'Column definitions (name type constraints, ...)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      greedy: true,
      markerOverride: {
        en: 'with',
        es: 'con',
        ja: 'で',
        ar: 'مع',
        ko: '으로',
        zh: '包含',
        tr: 'ile',
        fr: 'avec',
      },
    }),
  ],
});

// =============================================================================
// DROP TABLE
// =============================================================================

export const dropTableSchema = defineCommand({
  action: 'drop-table',
  description: 'Remove a table from the database',
  category: 'schema',
  primaryRole: 'table',
  roles: [
    defineRole({
      role: 'table',
      description: 'Name of the table to drop',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// ALTER TABLE — ADD COLUMN
// =============================================================================

export const addColumnSchema = defineCommand({
  action: 'add-column',
  description: 'Add a column to an existing table',
  category: 'schema',
  primaryRole: 'column',
  roles: [
    defineRole({
      role: 'column',
      description: 'Column definition (name type constraints)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
      greedy: true,
    }),
    defineRole({
      role: 'table',
      description: 'Target table',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'à',
      },
    }),
  ],
});

// =============================================================================
// RENAME TABLE
// =============================================================================

export const renameTableSchema = defineCommand({
  action: 'rename-table',
  description: 'Rename an existing table',
  category: 'schema',
  primaryRole: 'table',
  roles: [
    defineRole({
      role: 'table',
      description: 'Current table name',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'new-name',
      description: 'New table name',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '으로',
        zh: '为',
        tr: 'olarak',
        fr: 'en',
      },
    }),
  ],
});
