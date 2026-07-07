/**
 * English SQL vocabulary — the only thing authored per language.
 * Grammar (word order, markers, script) comes from `@lokascript/semantic`'s
 * English profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'select' },
    // Natural-language aliases for the mutation verbs: both the formal and
    // the natural verb parse into the same SemanticNode, so codegen stays
    // untouched.
    insert: { primary: 'insert', alternatives: ['add'] },
    update: { primary: 'update', alternatives: ['change'] },
    delete: { primary: 'delete', alternatives: ['remove'] },
    get: { primary: 'get' },
  },
  // Schema markers + connectives + literals (verbs are derived from `keywords`).
  tokenizerKeywords: [
    'from',
    'into',
    'where',
    'set',
    'values',
    'limit',
    'and',
    'or',
    'not',
    'null',
    'true',
    'false',
    'between',
    'like',
    'in',
    'is',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
