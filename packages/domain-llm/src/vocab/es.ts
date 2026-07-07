/**
 * Spanish LLM vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'preguntar' },
    summarize: { primary: 'resumir' },
    analyze: { primary: 'analizar' },
    translate: { primary: 'traducir' },
  },
  tokenizerKeywords: ['de', 'como', 'en', 'a', 'y', 'o'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
