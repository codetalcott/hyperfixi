/**
 * Portuguese FlowScript vocabulary (bridge-era language, arc Phase 2).
 * Grammar (SVO, Latin script) comes from `@lokascript/semantic`'s Portuguese
 * profile via the framework bridge — one vocab file, no hand-authored
 * profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'buscar' },
    poll: { primary: 'sondar' },
    stream: { primary: 'transmitir' },
    submit: { primary: 'enviar' },
    transform: { primary: 'transformar' },
    enter: { primary: 'entrar' },
    follow: { primary: 'seguir' },
    perform: { primary: 'executar' },
    capture: { primary: 'capturar' },
  },
  // Schema marker words (como/em/cada/para/com/item).
  tokenizerKeywords: ['como', 'em', 'cada', 'para', 'com', 'item'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
