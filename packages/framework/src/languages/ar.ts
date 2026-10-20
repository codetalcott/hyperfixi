/**
 * Arabic Grammar
 *
 * VSO word order, prepositions, RTL (right-to-left), space-separated.
 * Features root-based morphology and rich verb conjugation.
 */

import type { GrammarProfile } from './types';

export const arabicGrammar = {
  code: 'ar',
  name: 'Arabic',
  nativeName: 'العربية',
  direction: 'rtl',
  script: 'arabic',
  wordOrder: 'VSO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: '', // No explicit marker - uses possessive pronouns
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: {
      primary: 'على',
      alternatives: ['في', 'إلى', 'ب', 'قبل', 'بعد'],
      position: 'before',
    },
    source: { primary: 'من', position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'بـ', alternatives: ['باستخدام'], position: 'before' },
  },
  tokenization: {
    prefixes: ['ال', 'و', 'ف', 'ب', 'ك', 'ل'],
  },
} satisfies GrammarProfile;
