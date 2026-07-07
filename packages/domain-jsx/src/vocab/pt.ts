/**
 * Portuguese JSX vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s Portuguese profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'elemento' },
    component: { primary: 'componente' },
    render: { primary: 'renderizar' },
    state: { primary: 'estado' },
    effect: { primary: 'efeito' },
    fragment: { primary: 'fragmento' },
  },
  // props→com, destination/deps→em, initial→inicial,
  // children(element)→contendo, children(component)→retornando.
  tokenizerKeywords: ['com', 'em', 'inicial', 'contendo', 'retornando'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
