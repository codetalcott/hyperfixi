/**
 * English BDD vocabulary — the only thing authored per language.
 * Grammar (word order) comes from `@lokascript/semantic`'s English profile via
 * the framework bridge. These are the structural step keywords; BDD's action /
 * state / assertion vocabulary lives in the renderer + mappings tables.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    given: { primary: 'given' },
    when: { primary: 'when' },
    then: { primary: 'then' },
    and: { primary: 'and' },
  },
};
