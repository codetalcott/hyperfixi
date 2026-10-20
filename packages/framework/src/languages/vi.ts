/**
 * Vietnamese Grammar
 *
 * SVO word order, prepositions, space-separated.
 * Vietnamese is an isolating (analytic) language with no inflection.
 * Uses Latin script with extensive diacritics for tone marking.
 */

import type { GrammarProfile } from './types';

export const vietnameseGrammar = {
  code: 'vi',
  name: 'Vietnamese',
  nativeName: 'Tiếng Việt',
  direction: 'ltr',
  script: 'latin',
  wordOrder: 'SVO',
  markingStrategy: 'preposition',
  usesSpaces: true,
  // Vietnamese uses base/dictionary form for commands
  defaultVerbForm: 'base',
  verb: {
    position: 'start',
    subjectDrop: true,
  },
  possessive: {
    marker: 'của', // Vietnamese uses "của" for possession (của tôi = my)
    markerPosition: 'between',
  },
  roleMarkers: {
    destination: { primary: 'vào', alternatives: ['cho', 'đến'], position: 'before' },
    source: { primary: 'từ', alternatives: ['khỏi'], position: 'before' },
    patient: { primary: '', position: 'before' },
    style: { primary: 'với', position: 'before' },
  },
} satisfies GrammarProfile;
