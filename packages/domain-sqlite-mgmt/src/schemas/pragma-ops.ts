/**
 * Pragma Operations — get/set SQLite pragmas
 *
 * SQLite PRAGMA commands for database configuration and introspection.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// PRAGMA GET (read a pragma value or table info)
// =============================================================================

export const pragmaGetSchema = defineCommand({
  action: 'pragma-get',
  description: 'Read a SQLite pragma value or table information',
  category: 'pragma',
  primaryRole: 'pragma',
  roles: [
    defineRole({
      role: 'pragma',
      description: 'Pragma name (e.g., journal_mode, table_info)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'target',
      description: 'Target table or parameter (optional)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'for',
        es: 'para',
        ja: 'の',
        ar: 'لـ',
        ko: '의',
        zh: '的',
        tr: 'için',
        fr: 'pour',
      },
    }),
  ],
});

// =============================================================================
// PRAGMA SET (set a pragma value)
// =============================================================================

export const pragmaSetSchema = defineCommand({
  action: 'pragma-set',
  description: 'Set a SQLite pragma value',
  category: 'pragma',
  primaryRole: 'pragma',
  roles: [
    defineRole({
      role: 'pragma',
      description: 'Pragma name (e.g., journal_mode, foreign_keys)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'value',
      description: 'Value to set',
      required: true,
      expectedTypes: ['expression', 'literal'],
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
        fr: 'à',
      },
    }),
  ],
});
