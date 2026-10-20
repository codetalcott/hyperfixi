/**
 * English Grammar
 *
 * SVO word order, prepositions, space-separated.
 */

import type { GrammarProfile } from './types';

export const englishGrammar = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // English infinitive and imperative are identical ("toggle", "save", "open")
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  possessive: {
    marker: "'s",
    markerPosition: 'after-object',
  },
  roleMarkers: {
    destination: { primary: 'on', alternatives: ['to', 'from'], position: 'before' },
    source: { primary: 'from', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'with', alternatives: ['by', 'using'], position: 'before' },
    responseType: { primary: 'as', position: 'before' },
    method: { primary: 'via', alternatives: ['using'], position: 'before' },
  },
} satisfies GrammarProfile;
