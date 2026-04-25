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
      sovPosition: 2,
    }),
    defineRole({
      role: 'values',
      description: 'SET clause assignments',
      required: true,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 1,
      sovPosition: 1,
      markerPosition: 'before',
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
// GET (natural-language alias for SELECT — English-only spike)
// =============================================================================
//
// Reads like intent ("get users where age > 18") rather than SQL literal.
// Lowered to a `select` SemanticNode before codegen — see generators/natural-lowering.ts.
// Roles reuse the `select` names (source, condition) so lowering only swaps `action`;
// `limit` is additive and handled by an extended generateSelect().

export const getSchema = defineCommand({
  action: 'get',
  description: 'Retrieve records (natural-language SELECT)',
  category: 'query',
  primaryRole: 'source',
  roles: [
    // Position ordering is descending: higher svoPosition = earlier in the
    // surface form. For `get users where <cond> limit <N>`:
    //   source (3) → condition (2) → limit (1)
    defineRole({
      role: 'source',
      description: 'Collection to read from',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 3,
      sovPosition: 2,
      // SOV-only source particles. SVO/VSO languages say bare "get users"
      // (natural English/Spanish/French/Arabic/Chinese); SOV languages need
      // a grammatical link between the noun and the verb — `users から 取得`
      // not `users 取得`. Matches `select`'s source markers for ja/ko/tr.
      markerOverride: {
        ja: 'から',
        ko: '에서',
        tr: 'den',
      },
    }),
    defineRole({
      role: 'condition',
      description: 'Filter predicate (WHERE clause)',
      required: false,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 2,
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
    defineRole({
      role: 'limit',
      description: 'Maximum rows to return',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 0,
      markerOverride: {
        en: 'limit',
        es: 'límite',
        ja: '件数',
        ar: 'حد',
        ko: '제한',
        zh: '限制',
        tr: 'limit',
        fr: 'limite',
      },
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [selectSchema, insertSchema, updateSchema, deleteSchema, getSchema];
