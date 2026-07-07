/**
 * Russian FlowScript vocabulary (bridge-era language, arc Phase 2). Grammar
 * (SVO, Cyrillic script) comes from `@lokascript/semantic`'s Russian profile
 * via the framework bridge — one vocab file, no hand-authored
 * profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ruVocabulary: DomainVocabulary = {
  keywords: {
    fetch: { primary: 'получить' },
    poll: { primary: 'опрашивать' },
    stream: { primary: 'транслировать' },
    submit: { primary: 'отправить' },
    transform: { primary: 'преобразовать' },
    enter: { primary: 'войти' },
    follow: { primary: 'следовать' },
    perform: { primary: 'выполнить' },
    capture: { primary: 'захватить' },
  },
  // Schema marker words (как/в/каждые/на/с/элемент).
  tokenizerKeywords: ['как', 'в', 'каждые', 'на', 'с', 'элемент'],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
