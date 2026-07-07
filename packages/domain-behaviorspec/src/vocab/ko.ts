/**
 * Korean BehaviorSpec vocabulary. Grammar (SOV) comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: '테스트' },
    given: { primary: '전제' },
    when: { primary: '동작' },
    expect: { primary: '기대' },
    after: { primary: '후' },
    not: { primary: '아님' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
