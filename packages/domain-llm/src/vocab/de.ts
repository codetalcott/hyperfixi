/**
 * German LLM vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s German profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'fragen' },
    summarize: { primary: 'zusammenfassen' },
    analyze: { primary: 'analysieren' },
    translate: { primary: 'übersetzen' },
  },
  // Schema marker words (source→aus, manner→als, quantity→in, destination→nach)
  // + connectives.
  tokenizerKeywords: ['aus', 'als', 'in', 'nach', 'und', 'oder'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
