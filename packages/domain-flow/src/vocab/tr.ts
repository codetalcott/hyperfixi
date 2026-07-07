/**
 * Turkish FlowScript vocabulary. Grammar (SOV, Latin script) comes from
 * `@lokascript/semantic`'s Turkish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const trVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'getir' },
    poll: { primary: 'yokla' },
    stream: { primary: 'aktar' },
    submit: { primary: 'gönder' },
    transform: { primary: 'dönüştür' },
    enter: { primary: 'gir' },
    follow: { primary: 'izle' },
    perform: { primary: 'yürüt' },
    capture: { primary: 'yakala' },
  },
  // Schema marker words (olarak/e/her/ile/öğe) + connectives.
  tokenizerKeywords: ['olarak', 'e', 'her', 'ile', 'dan', 'öğe'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
