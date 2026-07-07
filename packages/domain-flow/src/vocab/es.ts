/**
 * Spanish FlowScript vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'obtener' },
    poll: { primary: 'sondear' },
    stream: { primary: 'transmitir' },
    submit: { primary: 'enviar' },
    transform: { primary: 'transformar' },
    enter: { primary: 'entrar' },
    follow: { primary: 'seguir' },
    perform: { primary: 'ejecutar' },
    capture: { primary: 'capturar' },
  },
  // Schema marker words (como/en/cada/a/con/elemento) + connectives.
  tokenizerKeywords: ['como', 'en', 'cada', 'a', 'con', 'de', 'elemento'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
