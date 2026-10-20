/**
 * Swahili Grammar
 *
 * SVO word order, prepositions, space-separated, agglutinative.
 * Features noun class system (18 classes) and verb agreement prefixes.
 */

import type { GrammarProfile } from './types';

export const swahiliGrammar = {
  code: 'sw',
  name: 'Swahili',
  nativeName: 'Kiswahili',
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
    marker: '', // Swahili uses possessive pronouns
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'kwenye', alternatives: ['kwa'], position: 'before' },
    source: { primary: 'kutoka', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'na', position: 'before' },
  },
} satisfies GrammarProfile;
