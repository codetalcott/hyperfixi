/**
 * Russian todo vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Cyrillic script) comes from `@lokascript/semantic`'s Russian profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const ruVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'добавить', alternatives: ['прибавить'] },
    complete: { primary: 'завершить', alternatives: ['выполнить'] },
    list: { primary: 'показать', alternatives: ['перечислить'] },
  },
  // Schema marker: list → 'в' (добавить … в …).
  tokenizerKeywords: ['в'],
};
