/**
 * Russian JSX vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Cyrillic script) comes from `@lokascript/semantic`'s Russian profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ruVocabulary: DomainVocabulary = {
  keywords: {
    element: { primary: 'элемент' },
    component: { primary: 'компонент' },
    render: { primary: 'отрисовать' },
    state: { primary: 'состояние' },
    effect: { primary: 'эффект' },
    fragment: { primary: 'фрагмент' },
  },
  // props→с, destination→в, initial→начально, deps→при,
  // children(element)→содержащий, children(component)→возвращающий.
  tokenizerKeywords: ['с', 'в', 'начально', 'при', 'содержащий', 'возвращающий'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
