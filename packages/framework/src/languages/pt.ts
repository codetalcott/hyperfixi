/**
 * Portuguese Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 */

import type { GrammarProfile } from './types';

export const portugueseGrammar = {
  code: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
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
    marker: 'de', // Uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'em', alternatives: ['para', 'a'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'com', position: 'before' },
  },
} satisfies GrammarProfile;
