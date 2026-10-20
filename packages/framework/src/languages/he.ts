/**
 * Hebrew Grammar
 *
 * SVO word order, prepositions, RTL (right-to-left), space-separated.
 * Hebrew uses prefix prepositions (ב, ל, מ, כ) that attach to the following word.
 * Features optional vowel points (nikkud) which are typically omitted in modern text.
 */

import type { GrammarProfile } from './types';

export const hebrewGrammar = {
  code: 'he',
  name: 'Hebrew',
  nativeName: 'עברית',
  direction: 'rtl',
  script: 'hebrew',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'second', // SVO - verb comes after subject
    subjectDrop: true,
  },
  possessive: {
    marker: 'של', // "of" - used for general possession
    markerPosition: 'before-property',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'על', alternatives: ['ב', 'אל', 'ל'], position: 'before' },
    source: { primary: 'מ', alternatives: ['מן', 'מאת'], position: 'before' },
    patient: { primary: 'את', position: 'before' }, // Direct object marker
    style: { primary: 'עם', alternatives: ['ב'], position: 'before' },
  },
  tokenization: {
    prefixes: ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'], // Common Hebrew prefixes
  },
} satisfies GrammarProfile;
