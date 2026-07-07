/**
 * French SQL vocabulary. Grammar comes from `@lokascript/semantic`'s
 * French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'sélectionner' },
    insert: { primary: 'insérer', alternatives: ['ajouter'] },
    update: { primary: 'mettre-à-jour', alternatives: ['modifier'] },
    delete: { primary: 'supprimer', alternatives: ['enlever'] },
    get: { primary: 'obtenir' },
  },
  tokenizerKeywords: [
    'de',
    'dans',
    'où',
    'définir',
    'valeurs',
    'limite',
    'et',
    'ou',
    'non',
    'nul',
    'vrai',
    'faux',
    'entre',
    'comme',
    'parmi',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
