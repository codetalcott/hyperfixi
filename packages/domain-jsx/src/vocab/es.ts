/**
 * Spanish JSX vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'elemento' },
    component: { primary: 'componente' },
    render: { primary: 'renderizar' },
    state: { primary: 'estado' },
    effect: { primary: 'efecto' },
    fragment: { primary: 'fragmento' },
  },
  tokenizerKeywords: ['con', 'en', 'inicial', 'conteniendo', 'retornando'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
