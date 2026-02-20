/**
 * Index Operations — CREATE INDEX, DROP INDEX
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// CREATE INDEX
// =============================================================================

export const createIndexSchema = defineCommand({
  action: 'create-index',
  description: 'Create an index on a table column',
  category: 'index',
  primaryRole: 'table',
  roles: [
    defineRole({
      role: 'table',
      description: 'Table to index',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
      markerOverride: {
        en: 'on',
        es: 'en',
        ja: 'の',
        ar: 'على',
        ko: '의',
        zh: '在',
        tr: 'de',
        fr: 'sur',
      },
    }),
    defineRole({
      role: 'column',
      description: 'Column to index',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'column',
        es: 'columna',
        ja: '列',
        ar: 'عمود',
        ko: '열',
        zh: '列',
        tr: 'sütun',
        fr: 'colonne',
      },
    }),
  ],
});

// =============================================================================
// DROP INDEX
// =============================================================================

export const dropIndexSchema = defineCommand({
  action: 'drop-index',
  description: 'Remove an index from the database',
  category: 'index',
  primaryRole: 'index',
  roles: [
    defineRole({
      role: 'index',
      description: 'Name of the index to drop',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});
