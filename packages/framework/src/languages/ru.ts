/**
 * Russian Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Russian is a fusional language with rich verb conjugation.
 * Uses infinitive form in software UI (industry standard).
 */

import type { GrammarProfile } from './types';

export const russianGrammar = {
  code: 'ru',
  name: 'Russian',
  nativeName: 'Русский',
  direction: 'ltr',
  script: 'cyrillic',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  defaultVerbForm: 'infinitive',
  verb: {
    position: 'start',
    subjectDrop: true,
    suffixes: ['ть', 'ться', 'ить', 'иться', 'ать', 'аться', 'еть', 'еться'],
  },
  possessive: {
    marker: '',
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'в', alternatives: ['на', 'к', 'во', 'ко'], position: 'before' },
    source: { primary: 'из', alternatives: ['от', 'с'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'с', alternatives: ['со'], position: 'before' },
  },
} satisfies GrammarProfile;
