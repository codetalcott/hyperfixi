/**
 * Turkish BehaviorSpec vocabulary. Grammar (SOV) comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: 'test' },
    given: { primary: 'verilen' },
    when: { primary: 'eylem' },
    expect: { primary: 'bekle' },
    after: { primary: 'sonra' },
    not: { primary: 'degil' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
