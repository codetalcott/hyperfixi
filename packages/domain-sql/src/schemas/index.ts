/**
 * SQL Command Schemas
 *
 * Defines the semantic structure of SQL commands using the framework's
 * defineCommand/defineRole helpers. Each schema specifies roles (columns,
 * source, condition, etc.) and per-language marker overrides for 8 languages.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// SELECT
// =============================================================================

export const selectSchema = defineCommand({
  action: 'select',
  description: 'Retrieve data from a table',
  category: 'query',
  primaryRole: 'columns',
  roles: [
    defineRole({
      role: 'columns',
      description: 'Columns to select',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'source',
      description: 'Table to select from',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'den',
        fr: 'de',
      },
    }),
    defineRole({
      role: 'condition',
      description: 'WHERE clause condition',
      required: false,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'where',
        es: 'donde',
        ja: '条件',
        ar: 'حيث',
        ko: '조건',
        zh: '条件',
        tr: 'koşul',
        fr: 'où',
      },
    }),
  ],
});

// =============================================================================
// INSERT
// =============================================================================

export const insertSchema = defineCommand({
  action: 'insert',
  description: 'Insert data into a table',
  category: 'mutation',
  primaryRole: 'values',
  roles: [
    defineRole({
      role: 'values',
      description: 'Values to insert',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'destination',
      description: 'Target table',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
      },
    }),
  ],
});

// =============================================================================
// UPDATE
// =============================================================================

export const updateSchema = defineCommand({
  action: 'update',
  description: 'Update data in a table',
  category: 'mutation',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'Table to update',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'values',
      description: 'SET clause assignments',
      required: true,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'set',
        es: 'establecer',
        ja: '設定',
        ar: 'عيّن',
        ko: '설정',
        zh: '设置',
        tr: 'ayarla',
        fr: 'définir',
      },
    }),
    defineRole({
      role: 'condition',
      description: 'WHERE clause condition',
      required: false,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'where',
        es: 'donde',
        ja: '条件',
        ar: 'حيث',
        ko: '조건',
        zh: '条件',
        tr: 'koşul',
        fr: 'où',
      },
    }),
  ],
});

// =============================================================================
// DELETE
// =============================================================================

export const deleteSchema = defineCommand({
  action: 'delete',
  description: 'Delete data from a table',
  category: 'mutation',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'Table to delete from',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'den',
        fr: 'de',
      },
    }),
    defineRole({
      role: 'condition',
      description: 'WHERE clause condition',
      required: false,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'where',
        es: 'donde',
        ja: '条件',
        ar: 'حيث',
        ko: '조건',
        zh: '条件',
        tr: 'koşul',
        fr: 'où',
      },
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [selectSchema, insertSchema, updateSchema, deleteSchema];
