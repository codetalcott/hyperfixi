/**
 * Indonesian Grammar
 *
 * SVO word order, prepositions, space-separated, agglutinative.
 * Features affixation for verb derivation (me-, ber-, di-, -kan, -i).
 */

import type { GrammarProfile } from './types';

export const indonesianGrammar = {
  code: 'id',
  name: 'Indonesian',
  nativeName: 'Bahasa Indonesia',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: '', // Indonesian: "X saya" (X of mine), possessor follows noun
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'pada', alternatives: ['ke', 'di'], position: 'before' },
    source: { primary: 'dari', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'dengan', position: 'before' },
  },
} satisfies GrammarProfile;
