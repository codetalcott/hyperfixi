/**
 * Turkish LLM vocabulary. Grammar (SOV, Latin script) comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    ask: { primary: 'sor' },
    summarize: { primary: 'özetle' },
    analyze: { primary: 'çözümle' },
    translate: { primary: 'çevir' },
  },
  tokenizerKeywords: ['dan', 'olarak', 'ile', 'e'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
