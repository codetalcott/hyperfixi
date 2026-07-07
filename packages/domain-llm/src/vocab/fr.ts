/**
 * French LLM vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'demander' },
    summarize: { primary: 'résumer' },
    analyze: { primary: 'analyser' },
    translate: { primary: 'traduire' },
  },
  tokenizerKeywords: ['de', 'comme', 'en', 'vers'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
