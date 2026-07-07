/**
 * English todo vocabulary — the only thing authored per language.
 * Grammar (word order, script) comes from `@lokascript/semantic`'s English
 * profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'add' },
    complete: { primary: 'complete', alternatives: ['done', 'finish'] },
    list: { primary: 'list', alternatives: ['show'] },
  },
  // Schema marker words (list → 'to'). The bridge never sees schemas, so the
  // marker words their `markerOverride`s use must be listed here to tokenize.
  tokenizerKeywords: ['to'],
};
