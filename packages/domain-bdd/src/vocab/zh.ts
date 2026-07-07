/**
 * Chinese BDD vocabulary. Grammar (SVO) comes from `@lokascript/semantic`'s
 * Chinese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const zhVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: '假设' },
    when: { primary: '当' },
    then: { primary: '那么' },
    and: { primary: '并且' },
  },
};
