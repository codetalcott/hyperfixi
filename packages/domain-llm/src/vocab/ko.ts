/**
 * Korean LLM vocabulary. Grammar (SOV, particles, Hangul script) comes from
 * `@lokascript/semantic`'s Korean profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const koVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: '질문' },
    summarize: { primary: '요약' },
    analyze: { primary: '분석' },
    translate: { primary: '번역' },
  },
  tokenizerKeywords: ['에서', '로'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
