/**
 * English LLM vocabulary — the only thing authored per language.
 * Grammar (word order, script) comes from `@lokascript/semantic`'s English
 * profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const enVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'ask' },
    summarize: { primary: 'summarize' },
    analyze: { primary: 'analyze' },
    translate: { primary: 'translate' },
  },
  // Schema marker words (source→from, manner→as, quantity→in, destination→to)
  // + connectives. The bridge never sees schemas, so these must be listed to
  // tokenize.
  tokenizerKeywords: ['from', 'as', 'in', 'to', 'and', 'or'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
