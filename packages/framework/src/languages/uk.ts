/**
 * Ukrainian Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Ukrainian is a fusional language with rich verb conjugation.
 * Uses infinitive form in software UI (industry standard).
 */

import type { GrammarProfile } from './types';

export const ukrainianGrammar = {
  code: 'uk',
  name: 'Ukrainian',
  nativeName: 'Українська',
  direction: 'ltr',
  script: 'cyrillic',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
    suffixes: ['ти', 'тися', 'ити', 'итися', 'ати', 'атися', 'іти', 'ітися'],
  },
  possessive: {
    marker: '',
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'в', alternatives: ['на', 'до'], position: 'before' },
    source: { primary: 'з', alternatives: ['від', 'із'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'з', alternatives: ['із'], position: 'before' },
  },
} satisfies GrammarProfile;
