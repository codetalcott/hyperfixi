/**
 * SQL Command Schemas
 *
 * Defines the semantic structure of SQL commands using the framework's
 * defineCommand/defineRole helpers. Each schema specifies roles (columns,
 * source, condition, etc.) and per-language marker overrides for 8 languages.
 */

import { defineCommand, defineRole, deriveRoleMarkers } from '@lokascript/framework';
import type { GrammarProfileSlice } from '@lokascript/framework';
import { germanProfile as deSlice } from '@lokascript/semantic/languages/de';
import { portugueseProfile as ptSlice } from '@lokascript/semantic/languages/pt';
import { russianProfile as ruSlice } from '@lokascript/semantic/languages/ru';

// =============================================================================
// Bridge-derived markers (arc Phase 1 expansion)
// =============================================================================
//
// The original 8 languages keep their hand-authored markerOverride entries.
// Bridge-era languages derive SQL markers from their semantic grammar slice
// where the semantic role lines up (FROM ≙ source, INTO ≙ destination);
// SQL-only markers (WHERE/SET/LIMIT) have no semantic role and stay explicit.

const BRIDGED_SLICES: Readonly<Record<string, GrammarProfileSlice>> = {
  de: deSlice,
  pt: ptSlice,
  ru: ruSlice,
};

/**
 * Compose a per-language `markerOverride` map for one domain role: markers
 * derived from the bridged slices' `semanticRole`, then explicit entries
 * (spread last, so they stay authoritative).
 */
function markerMap(semanticRole: string, explicit: Record<string, string>): Record<string, string> {
  const derived: Record<string, string> = {};
  for (const [lang, slice] of Object.entries(BRIDGED_SLICES)) {
    const marker = deriveRoleMarkers(slice, { role: semanticRole }).role;
    if (marker) derived[lang] = marker;
  }
  return { ...derived, ...explicit };
}

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
      // de/pt/ru derive from their semantic slices (von/de/из).
      markerOverride: markerMap('source', {
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'den',
        fr: 'de',
      }),
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
        de: 'wo',
        pt: 'onde',
        ru: 'где',
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
      // pt/ru derive from their semantic slices (em/в); German's slice
      // destination ('auf') is wrong for INSERT INTO, so 'in' is explicit.
      markerOverride: markerMap('destination', {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'e',
        fr: 'dans',
        de: 'in',
      }),
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
        de: 'setzen',
        pt: 'definir',
        ru: 'установить',
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
        de: 'wo',
        pt: 'onde',
        ru: 'где',
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
      // de/pt/ru derive from their semantic slices (von/de/из).
      markerOverride: markerMap('source', {
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'den',
        fr: 'de',
      }),
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
        de: 'wo',
        pt: 'onde',
        ru: 'где',
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
        de: 'wo',
        pt: 'onde',
        ru: 'где',
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
        de: 'limit',
        pt: 'limite',
        ru: 'лимит',
      },
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [selectSchema, insertSchema, updateSchema, deleteSchema, getSchema];
