/**
 * German FlowScript vocabulary (bridge-era language, arc Phase 2). Grammar
 * (SVO, Latin script) comes from `@lokascript/semantic`'s German profile via
 * the framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'abrufen' },
    poll: { primary: 'abfragen' },
    stream: { primary: 'streamen' },
    submit: { primary: 'senden' },
    transform: { primary: 'transformieren' },
    enter: { primary: 'eintreten' },
    follow: { primary: 'folgen' },
    perform: { primary: 'ausführen' },
    capture: { primary: 'erfassen' },
  },
  // Schema marker words (als/in/alle/an/mit/element).
  tokenizerKeywords: ['als', 'in', 'alle', 'an', 'mit', 'element'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
