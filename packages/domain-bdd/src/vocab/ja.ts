/**
 * Japanese BDD vocabulary. Grammar (SOV) comes from `@lokascript/semantic`'s
 * Japanese profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const jaVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: '前提' },
    when: { primary: 'したら' },
    then: { primary: 'ならば' },
    and: { primary: 'かつ' },
  },
};
