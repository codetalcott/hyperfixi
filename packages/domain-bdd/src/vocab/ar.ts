/**
 * Arabic BDD vocabulary. Grammar (VSO, RTL) comes from `@lokascript/semantic`'s
 * Arabic profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const arVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: 'بافتراض' },
    when: { primary: 'عند' },
    then: { primary: 'فإن' },
    and: { primary: 'و' },
  },
};
