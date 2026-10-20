/**
 * Spanish Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Features rich verb conjugation with pro-drop (subject omission).
 */

import type { GrammarProfile } from './types';

export const spanishGrammar = {
  code: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Infinitive is standard for Spanish software UI (Guardar, Cancelar, Abrir)
  // This matches macOS, Windows, and web app conventions
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: 'de', // Spanish uses "de" for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    // `hacia` is the i18n grammar's optional destination render form ("towards");
    // without it here a rendered/user `hacia` clause silently dropped the
    // destination (add → default `me`, put → null parse). Vocab Batch 1 (V2+V4).
    destination: { primary: 'en', alternatives: ['sobre', 'a', 'hacia'], position: 'before' },
    source: { primary: 'de', alternatives: ['desde'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'con', position: 'before' },
  },
} satisfies GrammarProfile;
