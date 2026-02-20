/**
 * Admin Operations — VACUUM, ANALYZE, ATTACH, DETACH
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// VACUUM
// =============================================================================

export const vacuumSchema = defineCommand({
  action: 'vacuum',
  description: 'Rebuild the database to reclaim space',
  category: 'admin',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Database name (optional, defaults to main)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// ANALYZE
// =============================================================================

export const analyzeSchema = defineCommand({
  action: 'analyze',
  description: 'Collect statistics about tables and indexes',
  category: 'admin',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Table or index name (optional, analyzes all if omitted)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// ATTACH
// =============================================================================

export const attachSchema = defineCommand({
  action: 'attach',
  description: 'Attach another database file',
  category: 'admin',
  primaryRole: 'path',
  roles: [
    defineRole({
      role: 'path',
      description: 'Path to the database file',
      required: true,
      expectedTypes: ['expression', 'literal'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'alias',
      description: 'Alias name for the attached database',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'as',
        es: 'como',
        ja: 'として',
        ar: 'كـ',
        ko: '로',
        zh: '为',
        tr: 'olarak',
        fr: 'comme',
      },
    }),
  ],
});

// =============================================================================
// DETACH
// =============================================================================

export const detachSchema = defineCommand({
  action: 'detach',
  description: 'Detach a previously attached database',
  category: 'admin',
  primaryRole: 'alias',
  roles: [
    defineRole({
      role: 'alias',
      description: 'Alias of the database to detach',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});
