/**
 * German JSX vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s German profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'element' },
    component: { primary: 'komponente' },
    render: { primary: 'rendern' },
    state: { primary: 'zustand' },
    effect: { primary: 'effekt' },
    fragment: { primary: 'fragment' },
  },
  // Schema marker words: props→mit, destination→in, initial→initial, deps→bei,
  // children(element)→enthaltend, children(component)→liefernd.
  tokenizerKeywords: ['mit', 'in', 'initial', 'bei', 'enthaltend', 'liefernd'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
