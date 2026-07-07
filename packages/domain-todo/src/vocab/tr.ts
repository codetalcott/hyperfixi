/**
 * Turkish todo vocabulary. Grammar (SOV, Latin script) comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'ekle' },
    complete: { primary: 'tamamla' },
    list: { primary: 'listele' },
  },
  // Schema marker: list → 'e'.
  tokenizerKeywords: ['e'],
};
