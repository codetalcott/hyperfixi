/**
 * View Operations — CREATE VIEW, DROP VIEW
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// CREATE VIEW
// =============================================================================

export const createViewSchema = defineCommand({
  action: 'create-view',
  description: 'Create a view based on a query',
  category: 'view',
  primaryRole: 'view',
  roles: [
    defineRole({
      role: 'view',
      description: 'Name of the view to create',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'query',
      description: 'The SELECT query for the view',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 2,
      greedy: true,
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
// DROP VIEW
// =============================================================================

export const dropViewSchema = defineCommand({
  action: 'drop-view',
  description: 'Remove a view from the database',
  category: 'view',
  primaryRole: 'view',
  roles: [
    defineRole({
      role: 'view',
      description: 'Name of the view to drop',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});
