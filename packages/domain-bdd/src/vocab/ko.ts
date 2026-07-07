/**
 * Korean BDD vocabulary. Grammar (SOV) comes from `@lokascript/semantic`'s
 * Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: '전제' },
    when: { primary: '만약' },
    then: { primary: '그러면' },
    and: { primary: '그리고' },
  },
};
