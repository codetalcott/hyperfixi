/**
 * Transaction Operations — BEGIN, COMMIT, ROLLBACK
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// BEGIN TRANSACTION
// =============================================================================

export const beginSchema = defineCommand({
  action: 'begin',
  description: 'Begin a transaction',
  category: 'transaction',
  primaryRole: 'mode',
  roles: [
    defineRole({
      role: 'mode',
      description: 'Transaction mode (deferred, immediate, exclusive)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// COMMIT
// =============================================================================

export const commitSchema = defineCommand({
  action: 'commit',
  description: 'Commit the current transaction',
  category: 'transaction',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Placeholder (commit takes no arguments)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// ROLLBACK
// =============================================================================

export const rollbackSchema = defineCommand({
  action: 'rollback',
  description: 'Roll back the current transaction',
  category: 'transaction',
  primaryRole: 'savepoint',
  roles: [
    defineRole({
      role: 'savepoint',
      description: 'Savepoint name to roll back to (optional)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'まで',
        ar: 'إلى',
        ko: '까지',
        zh: '到',
        tr: 'e',
        fr: 'à',
      },
    }),
  ],
});
