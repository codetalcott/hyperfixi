/**
 * French BDD vocabulary. Grammar (SVO) comes from `@lokascript/semantic`'s
 * French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: 'soit' },
    when: { primary: 'quand' },
    then: { primary: 'alors' },
    and: { primary: 'et' },
  },
};
