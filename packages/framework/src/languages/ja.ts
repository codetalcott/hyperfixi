/**
 * Japanese Grammar
 *
 * SOV word order, particles (を, に, で, etc.), no spaces between words.
 * Agglutinative language with rich verb conjugation.
 */

import type { GrammarProfile } from './types';

export const japaneseGrammar = {
  code: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  direction: 'ltr',
  script: 'cjk',
  wordOrder: 'SOV',
  markingStrategy: 'particle',
  usesSpaces: false,
  // Japanese uses verb stem/masu-stem form, no clear infinitive/imperative distinction
  // for UI commands. Uses katakana loanwords (トグル) or native stems (切り替え)
  defaultVerbForm: 'base',
  verb: {
    position: 'end',
    suffixes: ['る', 'て', 'た', 'ます', 'ない'],
    subjectDrop: true,
  },
  possessive: {
    marker: 'の',
    markerPosition: 'between',
  },
  roleMarkers: {
    patient: { primary: 'を', position: 'after' },
    destination: { primary: 'に', alternatives: ['へ', 'で', 'の'], position: 'after' },
    source: { primary: 'から', position: 'after' },
    style: { primary: 'で', position: 'after' },
    event: { primary: 'を', position: 'after' }, // Event as object marker
    // Possession marker for "X's Y" patterns
    // Note: の is used between target and patient: #button の .active
  },
  tokenization: {
    particles: ['を', 'に', 'で', 'から', 'の', 'が', 'は', 'も', 'へ', 'と'],
    boundaryStrategy: 'particle',
  },
  // Japanese writes a particle onto its noun (`#outに`, `自分から`; M2 N5).
  attachedMarkers: {
    markers: ['を', 'に', 'へ', 'で', 'の', 'から', 'として', 'の間で'],
    afterWords: 'all',
  },
} satisfies GrammarProfile;
