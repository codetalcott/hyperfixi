/**
 * French todo vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'ajouter' },
    complete: { primary: 'terminer' },
    list: { primary: 'lister', alternatives: ['afficher'] },
  },
  // Schema marker: list → 'à'.
  tokenizerKeywords: ['à'],
};
