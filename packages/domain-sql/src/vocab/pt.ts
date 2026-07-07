/**
 * Portuguese SQL vocabulary — added via the framework↔semantic bridge: this
 * file is the ONLY Portuguese-specific authoring in the domain (grammar
 * comes from `@lokascript/semantic`'s Portuguese profile).
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'selecionar' },
    insert: { primary: 'inserir', alternatives: ['adicionar', 'acrescentar'] },
    update: { primary: 'atualizar', alternatives: ['alterar', 'modificar'] },
    delete: { primary: 'excluir', alternatives: ['remover', 'apagar'] },
    get: { primary: 'obter' },
  },
  tokenizerKeywords: [
    'de',
    'em',
    'onde',
    'definir',
    'valores',
    'limite',
    'e',
    'ou',
    'não',
    'nulo',
    'verdadeiro',
    'falso',
    'entre',
    'como',
    'é',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
