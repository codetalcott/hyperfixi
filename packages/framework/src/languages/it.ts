/**
 * Italian Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 * Very similar to Spanish but with Italian-specific vocabulary.
 */

import type { GrammarProfile } from './types';

export const italianGrammar = {
  code: 'it',
  name: 'Italian',
  nativeName: 'Italiano',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for Italian software UI (Salvare, Annullare, Aprire)
  // This matches macOS, Windows, and web app conventions
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: 'di', // Italian uses "di" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'in', alternatives: ['su', 'a'], position: 'before' },
    source: { primary: 'da', alternatives: ['di'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
} satisfies GrammarProfile;
