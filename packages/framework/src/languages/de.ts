/**
 * German Grammar
 *
 * SVO word order (V2 in main clauses), prepositions, space-separated.
 * Features case system, compound words, and verb-second word order in main clauses.
 */

import type { GrammarProfile } from './types';

export const germanGrammar = {
  code: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for German software UI (Speichern, Öffnen, Schließen)
  // Also used in written instructions ("Bitte nicht stören")
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  possessive: {
    marker: '', // German uses possessive pronouns directly
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'auf', alternatives: ['zu', 'in'], position: 'before' },
    source: { primary: 'von', alternatives: ['aus'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'mit', position: 'before' },
  },
} satisfies GrammarProfile;
