/**
 * Turkish BDD vocabulary. Grammar (SOV) comes from `@lokascript/semantic`'s
 * Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: 'varsayalım' },
    when: { primary: 'olduğunda' },
    then: { primary: 'sonra' },
    and: { primary: 've' },
  },
};
