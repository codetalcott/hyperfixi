/**
 * Spanish todo vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'agregar', alternatives: ['añadir'] },
    complete: { primary: 'completar', alternatives: ['terminar'] },
    list: { primary: 'listar', alternatives: ['mostrar'] },
  },
  tokenizerKeywords: ['a'],
};
