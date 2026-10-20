/**
 * French Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation and gendered articles.
 */

import type { GrammarProfile } from './types';

export const frenchGrammar = {
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for French software UI (Enregistrer, Ouvrir, Fermer)
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: false,
  },
  possessive: {
    marker: 'de', // Uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'sur', alternatives: ['à', 'dans'], position: 'before' },
    source: { primary: 'de', alternatives: ['depuis'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'avec', position: 'before' },
  },
} satisfies GrammarProfile;
