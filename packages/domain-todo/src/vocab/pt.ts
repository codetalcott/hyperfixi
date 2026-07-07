/**
 * Portuguese todo vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s Portuguese profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'adicionar', alternatives: ['acrescentar'] },
    complete: { primary: 'concluir', alternatives: ['terminar'] },
    list: { primary: 'listar', alternatives: ['mostrar'] },
  },
  // Schema marker: list → 'a' (adicionar … a …).
  tokenizerKeywords: ['a'],
};
