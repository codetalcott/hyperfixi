/**
 * Bengali Grammar
 *
 * SOV word order, postpositions (কে, তে, থেকে, etc.), Bengali script.
 * Agglutinative language similar to Hindi.
 */

import type { GrammarProfile } from './types';

export const bengaliGrammar = {
  code: 'bn',
  name: 'Bengali',
  nativeName: 'বাংলা',
  direction: 'ltr',
  script: 'bengali',
  wordOrder: 'SOV',
  markingStrategy: 'postposition',
  usesSpaces: true,
  defaultVerbForm: 'imperative',
  verb: {
    position: 'end',
    suffixes: ['ুন', 'ো', 'া', 'ে', 'ি'],
    subjectDrop: true,
  },
  possessive: {
    marker: 'র',
    markerPosition: 'between',
  },
  roleMarkers: {
    patient: { primary: 'কে', position: 'after' },
    destination: { primary: 'তে', alternatives: ['এ'], position: 'after' },
    source: { primary: 'থেকে', position: 'after' },
    style: { primary: 'দিয়ে', position: 'after' },
    event: { primary: 'তে', position: 'after' },
  },
  tokenization: {
    particles: ['কে', 'তে', 'থেকে', 'র', 'এর', 'দিয়ে', 'জন্য', 'পর্যন্ত'],
    boundaryStrategy: 'space',
  },
  // Bengali writes a case ending onto its noun (`#outকে`, `#outএ`; M2 N5).
  // After a Bengali word only `কে`, which never changes: the locative is `তে`
  // after a vowel and the vowel sign `ে` after a consonant (`ক্লিকে`), which
  // the reader does not split.
  attachedMarkers: { markers: ['কে', 'তে', 'এ'], afterWords: ['কে'] },
} satisfies GrammarProfile;
