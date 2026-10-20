/**
 * Chinese (Simplified) Grammar
 *
 * SVO word order, no markers (relies on word order), no spaces between words.
 * Isolating language with topic-comment structure and optional BA construction.
 */

import type { GrammarProfile } from './types';

export const chineseGrammar = {
  code: 'zh',
  name: 'Chinese',
  nativeName: '中文',
  direction: 'ltr',
  script: 'cjk',
  wordOrder: 'SVO',
  markingStrategy: 'preposition', // Uses prepositions but often implicit
  usesSpaces: false,
  verb: {
    position: 'second',
    subjectDrop: true,
  },
  possessive: {
    marker: '的', // Possessive particle (de)
    markerPosition: 'between',
  },
  roleMarkers: {
    destination: { primary: '在', alternatives: ['到', '于'], position: 'before' },
    source: { primary: '从', alternatives: ['由'], position: 'before' },
    patient: { primary: '把', position: 'before' }, // BA construction
    style: { primary: '用', alternatives: ['以'], position: 'before' },
  },
  tokenization: {
    boundaryStrategy: 'character',
  },
} satisfies GrammarProfile;
