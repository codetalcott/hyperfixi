/**
 * Polish Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Polish is a fusional language with rich verb conjugation.
 * Unlike most languages, Polish software UI uses IMPERATIVE form.
 */

import type { GrammarProfile } from './types';

export const polishGrammar = {
  code: 'pl',
  name: 'Polish',
  nativeName: 'Polski',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Polish uses imperative form for commands in software UI
  // (unlike most languages that use infinitive)
  defaultVerbForm: 'imperative',
  verb: {
    position: 'start',
    subjectDrop: true,
    suffixes: ['ać', 'eć', 'ić', 'yć', 'ąć', 'ować'],
  },
  possessive: {
    marker: '', // Polish uses genitive case, not a marker
    markerPosition: 'after-object',
    usePossessiveAdjectives: true,
  },
  roleMarkers: {
    destination: { primary: 'do', alternatives: ['w', 'na', 'we'], position: 'before' },
    source: { primary: 'z', alternatives: ['od', 'ze'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'z', alternatives: ['ze'], position: 'before' },
  },
} satisfies GrammarProfile;
