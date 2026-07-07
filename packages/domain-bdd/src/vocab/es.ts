/**
 * Spanish BDD vocabulary. Grammar (SVO) comes from `@lokascript/semantic`'s
 * Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: 'dado' },
    when: { primary: 'cuando' },
    then: { primary: 'entonces' },
    and: { primary: 'y' },
  },
};
