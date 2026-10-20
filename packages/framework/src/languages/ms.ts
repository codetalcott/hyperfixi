/**
 * Malay Grammar
 *
 * SVO word order, prepositions, space-separated.
 */

import type { GrammarProfile } from './types';

export const malayGrammar = {
  code: 'ms',
  name: 'Malay',
  nativeName: 'Melayu',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: '', // Malay often uses suffix or juxtaposition
    markerPosition: 'after-object',
  },
  roleMarkers: {
    destination: { primary: 'ke', alternatives: ['pada'], position: 'before' },
    source: { primary: 'dari', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'dengan', position: 'before' },
  },
} satisfies GrammarProfile;
