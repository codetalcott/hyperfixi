/**
 * Portuguese LLM vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s Portuguese profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'perguntar' },
    summarize: { primary: 'resumir' },
    analyze: { primary: 'analisar' },
    translate: { primary: 'traduzir' },
  },
  // Schema marker words (source→de, manner→como, quantity→em, destination→para)
  // + connectives.
  tokenizerKeywords: ['de', 'como', 'em', 'para', 'e', 'ou'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
