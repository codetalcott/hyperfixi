/**
 * English BehaviorSpec vocabulary — the only thing authored per language.
 * Grammar (word order) comes from `@lokascript/semantic`'s English profile via
 * the framework bridge. These are the structural keywords; BehaviorSpec's
 * interaction/assertion vocabulary lives in the renderer + mappings tables.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: 'test' },
    given: { primary: 'given' },
    when: { primary: 'when' },
    expect: { primary: 'expect' },
    after: { primary: 'after' },
    not: { primary: 'not' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
