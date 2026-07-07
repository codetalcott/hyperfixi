/**
 * German todo vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s German profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const deVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'hinzufügen', alternatives: ['ergänzen'] },
    complete: { primary: 'erledigen', alternatives: ['abschließen'] },
    list: { primary: 'auflisten', alternatives: ['anzeigen'] },
  },
  // Schema marker: list → 'zu' (add … to …).
  tokenizerKeywords: ['zu'],
};
