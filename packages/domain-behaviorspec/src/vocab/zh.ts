/**
 * Chinese BehaviorSpec vocabulary. Grammar (SVO) comes from
 * `@lokascript/semantic`'s Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    test: { primary: '测试' },
    given: { primary: '假设' },
    when: { primary: '当' },
    expect: { primary: '期望' },
    after: { primary: '之后' },
    not: { primary: '不' },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
